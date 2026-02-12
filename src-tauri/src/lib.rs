#![cfg_attr(all(not(debug_assertions), target_os = "windows"), windows_subsystem = "windows")]
#![cfg_attr(mobile, tauri::mobile_entry_point)]

use std::time::Duration;

use chrono::Utc;
use rand::Rng;
use serde::Serialize;
use tauri::{App, AppHandle, Emitter, Manager, State};
use thiserror::Error;
use tokio::sync::RwLock;
use tokio::time::sleep;

/// 市场快照（给前端的结构，可以后续扩展）
#[derive(Debug, Clone, Serialize)]
pub struct MarketSnapshot {
  pub symbol: String,
  pub price: f64,
  pub macd: f64,
  pub signal: f64,
  pub hist: f64,
  pub ts: i64,
}

/// 全局共享状态（Tauri 的 State，内含异步锁）
pub struct AppState {
  pub latest_snapshot: RwLock<Option<MarketSnapshot>>,
}

impl AppState {
  pub fn new() -> Self {
    Self {
      latest_snapshot: RwLock::new(None),
    }
  }
}

#[derive(Debug, Error)]
pub enum DataError {
  #[error("network error: {0}")]
  Network(String),
  #[error("rate limited")]
  RateLimited,
  #[error("unknown: {0}")]
  Unknown(String),
}

/// 预留的数据抓取接口（现在用随机数 + 本地模拟，方便 debug）
/// 实际接入时，把这里替换成 yfinance / Alpha Vantage / 你的聚合层即可。
async fn fetch_market_data_mock(symbol: &str) -> Result<MarketSnapshot, DataError> {
  let mut rng = rand::thread_rng();
  let base_price = 100.0 + rng.gen_range(-5.0..5.0);

  Ok(MarketSnapshot {
    symbol: symbol.to_string(),
    price: base_price,
    macd: rng.gen_range(-2.0..2.0),
    signal: rng.gen_range(-2.0..2.0),
    hist: rng.gen_range(-1.0..1.0),
    ts: Utc::now().timestamp(),
  })
}

/// 简单的容错 + 降级策略：
/// - 多次重试（带指数退避）
/// - 区分“被限流”和普通网络错误，限流时主动延长心跳间隔，防止 API 被封
async fn robust_fetch(symbol: &str) -> Result<MarketSnapshot, DataError> {
  let mut attempt = 0usize;
  let max_attempts = 3;

  loop {
    attempt += 1;

    let result = fetch_market_data_mock(symbol).await;

    match result {
      Ok(snapshot) => return Ok(snapshot),
      Err(DataError::RateLimited) => {
        eprintln!("[data-engine] rate limited when fetching {symbol}, backing off...");
        // 硬性退避，避免继续触发封禁
        sleep(Duration::from_secs(60)).await;
      }
      Err(e) => {
        eprintln!("[data-engine] error fetching {symbol} (attempt {attempt}): {e}");

        if attempt >= max_attempts {
          return Err(e);
        }

        // 指数退避 + 抖动，减小雪崩概率
        let backoff = 2u64.pow(attempt as u32);
        let jitter = rand::thread_rng().gen_range(0..=backoff);
        sleep(Duration::from_secs(backoff + jitter)).await;
      }
    }
  }
}

/// 每 10 秒执行一次的心跳循环任务：
/// - 调 robust_fetch
/// - 写入全局状态
/// - 将来可以在这里做多标的并发抓取（FuturesUnordered + 限流）
async fn heartbeat_loop(app_handle: AppHandle) {
  let symbol = "AAPL"; // 先写死一个，后面可以做“当前选中股票”

  loop {
    {
      let state: State<'_, AppState> = app_handle.state::<AppState>();

      match robust_fetch(symbol).await {
        Ok(snapshot) => {
          {
            let mut guard = state.latest_snapshot.write().await;
            *guard = Some(snapshot.clone());
          }

          // 通过事件广播给前端
          if let Err(e) = app_handle.emit("market://snapshot", &snapshot) {
            eprintln!("[data-engine] failed to emit snapshot event: {e}");
          }
        }
        Err(e) => {
          eprintln!("[data-engine] heartbeat failed: {e}");
        }
      }
    }

    // 固定 10 秒心跳（后续若被 RateLimited，可在 robust_fetch 里拉长）
    sleep(Duration::from_secs(10)).await;
  }
}

/// 给前端调用的命令：主动拉取当前最新快照
#[tauri::command]
async fn get_latest_snapshot(
  state: State<'_, AppState>,
) -> Result<Option<MarketSnapshot>, String> {
  let guard = state.latest_snapshot.read().await;
  Ok(guard.clone())
}

fn setup_background_tasks(app: &App) {
  let handle = app.handle();
  tauri::async_runtime::spawn(heartbeat_loop(handle.clone()));
}

/// 桌面 / 移动统一入口
pub fn run() {
  tauri::Builder::default()
    .manage(AppState::new())
    .invoke_handler(tauri::generate_handler![get_latest_snapshot])
    .setup(|app| {
      setup_background_tasks(app);
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running Apex Vision");
}

