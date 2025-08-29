;; AggregationContract for Virtual Power Plant (VPP)
;; Manages energy production aggregation, forecasting, and supply balancing
;; Integrates with ProductionOracleContract, MarketplaceContract, and GovernanceContract

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_INVALID_AMOUNT (err u101))
(define-constant ERR_INVALID_DEVICE (err u102))
(define-constant ERR_PAUSED (err u103))
(define-constant ERR_GOVERNANCE_NOT_APPROVED (err u104))
(define-constant ERR_INVALID_TIMESTAMP (err u105))
(define-constant ERR_INVALID_THRESHOLD (err u106))
(define-constant MAX_REPORTS_PER_DEVICE u100)
(define-constant FORECAST_WINDOW u144) ;; 24 hours at 10-minute intervals

;; Data Maps
(define-map device-aggregates
  { device-id: uint }
  { total-energy: uint, last-updated: uint, active: bool })

(define-map production-reports
  { device-id: uint, report-id: uint }
  { energy-kwh: uint, timestamp: uint, verified: bool })

(define-map vpp-stats
  { vpp-id: uint }
  { total-energy: uint, reserve-threshold: uint, last-forecast: uint })

(define-map historical-forecasts
  { vpp-id: uint, timestamp: uint }
  { predicted-energy: uint, actual-energy: uint })

;; Variables
(define-data-var contract-paused bool false)
(define-data-var governance-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var oracle-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var marketplace-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var reserve-threshold uint u1000) ;; Minimum kWh reserve
(define-data-var total-vpp-energy uint u0)

;; Read-Only Functions
(define-read-only (get-device-aggregate (device-id uint))
  (map-get? device-aggregates { device-id: device-id }))

(define-read-only (get-production-report (device-id uint) (report-id uint))
  (map-get? production-reports { device-id: device-id, report-id: report-id }))

(define-read-only (get-vpp-stats (vpp-id uint))
  (map-get? vpp-stats { vpp-id: vpp-id }))

(define-read-only (get-forecast (vpp-id uint) (timestamp uint))
  (map-get? historical-forecasts { vpp-id: vpp-id, timestamp: timestamp }))

(define-read-only (is-contract-paused)
  (var-get contract-paused))

(define-read-only (get-total-vpp-energy)
  (var-get total-vpp-energy))

(define-read-only (get-reserve-threshold)
  (var-get reserve-threshold))

;; Private Functions
(define-private (is-governance-approved (proposal-id uint))
  ;; Mock governance check (replace with actual contract-call in production)
  (ok true))

(define-private (calculate-forecast (vpp-id uint))
  (let
    (
      (stats (unwrap! (get-vpp-stats vpp-id) (err u107)))
      (recent-reports
        (fold
          (lambda (acc device-id)
            (let
              (
                (aggregate (unwrap! (get-device-aggregate device-id) acc))
                (energy (get total-energy aggregate))
              )
              (+ acc energy)
            )
          )
          (list u1 u2 u3 u4 u5) ;; Example device IDs
          u0
        )
      )
      (avg-energy (/ recent-reports u5)) ;; Simple moving average
    )
    (ok avg-energy)
  )
)

;; Public Functions
(define-public (register-device-energy
  (device-id uint)
  (energy-kwh uint)
  (timestamp uint)
  (report-id uint))
  (let
    (
      (aggregate (unwrap! (get-device-aggregate device-id) ERR_INVALID_DEVICE))
      (current-block (unwrap! (get-block-info? time u0) ERR_INVALID_TIMESTAMP))
    )
    (if (var-get contract-paused)
      ERR_PAUSED
      (if (not (get active aggregate))
        ERR_INVALID_DEVICE
        (if (> energy-kwh u0)
          (begin
            (map-set production-reports
              { device-id: device-id, report-id: report-id }
              { energy-kwh: energy-kwh, timestamp: current-block, verified: false })
            (map-set device-aggregates
              { device-id: device-id }
              (merge aggregate
                {
                  total-energy: (+ (get total-energy aggregate) energy-kwh),
                  last-updated: current-block
                }))
            (var-set total-vpp-energy
              (+ (var-get total-vpp-energy) energy-kwh))
            (ok true)
          )
          ERR_INVALID_AMOUNT
        )
      )
    )
  )
)

(define-public (verify-report
  (device-id uint)
  (report-id uint))
  (let
    (
      (report (unwrap! (get-production-report device-id report-id) ERR_INVALID_DEVICE))
      (caller (unwrap! (get-caller) ERR_UNAUTHORIZED))
    )
    (if (is-eq caller (var-get oracle-contract))
      (begin
        (map-set production-reports
          { device-id: device-id, report-id: report-id }
          (merge report { verified: true }))
        (ok true)
      )
      ERR_UNAUTHORIZED
    )
  )
)

(define-public (update-reserve-threshold (new-threshold uint) (proposal-id uint))
  (begin
    (if (var-get contract-paused)
      ERR_PAUSED
      (if (is-ok (is-governance-approved proposal-id))
        (if (> new-threshold u0)
          (begin
            (var-set reserve-threshold new-threshold)
            (ok true)
          )
          ERR_INVALID_THRESHOLD
        )
        ERR_GOVERNANCE_NOT_APPROVED
      )
    )
  )
)

(define-public (generate-forecast (vpp-id uint))
  (begin
    (if (var-get contract-paused)
      ERR_PAUSED
      (let
        (
          (forecast (unwrap! (calculate-forecast vpp-id) ERR_INVALID_AMOUNT))
          (current-block (unwrap! (get-block-info? time u0) ERR_INVALID_TIMESTAMP))
        )
        (map-set historical-forecasts
          { vpp-id: vpp-id, timestamp: current-block }
          { predicted-energy: forecast, actual-energy: u0 })
        (map-set vpp-stats
          { vpp-id: vpp-id }
          {
            total-energy: (var-get total-vpp-energy),
            reserve-threshold: (var-get reserve-threshold),
            last-forecast: forecast
          })
        (ok forecast)
      )
    )
  )
)

(define-public (balance-supply (vpp-id uint) (required-energy uint))
  (let
    (
      (stats (unwrap! (get-vpp-stats vpp-id) ERR_INVALID_DEVICE))
      (available-energy (var-get total-vpp-energy))
    )
    (if (var-get contract-paused)
      ERR_PAUSED
      (if (>= available-energy (+ required-energy (var-get reserve-threshold)))
        (begin
          (var-set total-vpp-energy (- available-energy required-energy))
          (map-set vpp-stats
            { vpp-id: vpp-id }
            (merge stats { total-energy: (- (get total-energy stats) required-energy) }))
          (ok true)
        )
        ERR_INVALID_AMOUNT
      )
    )
  )
)

(define-public (pause-contract)
  (begin
    (if (is-eq tx-sender CONTRACT_OWNER)
      (begin
        (var-set contract-paused true)
        (ok true)
      )
      ERR_UNAUTHORIZED
    )
  )
)

(define-public (unpause-contract)
  (begin
    (if (is-eq tx-sender CONTRACT_OWNER)
      (begin
        (var-set contract-paused false)
        (ok true)
      )
      ERR_UNAUTHORIZED
    )
  )
)

(define-public (set-governance-contract (new-governance principal))
  (begin
    (if (is-eq tx-sender CONTRACT_OWNER)
      (begin
        (var-set governance-contract new-governance)
        (ok true)
      )
      ERR_UNAUTHORIZED
    )
  )
)

(define-public (set-oracle-contract (new-oracle principal))
  (begin
    (if (is-eq tx-sender CONTRACT_OWNER)
      (begin
        (var-get oracle-contract)
        (ok true)
      )
      ERR_UNAUTHORIZED
    )
  )
)

;; Helper function to get caller
(define-private (get-caller)
  (ok tx-sender)
)