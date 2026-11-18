#!/bin/sh
# Memanggil job tagihan Biaya Layanan MyGerai (POST /api/cron/bill-service-fee) sekali seminggu.
#
#   mygerai-cron once   panggil sekarang
#   mygerai-cron loop   panggil tiap hari BILL_WEEKDAY_UTC (0 = Minggu) jam BILL_HOUR_UTC:00 UTC (default)
#
# CRON_SECRET dibaca dari env container dan dikirim sebagai Bearer token; nilainya tidak pernah dicetak.
# Run yang gagal tidak diulang di sini: job-nya sendiri menagih periode yang bolong pada run berikutnya.
set -eu

BILL_WEEKDAY_UTC=${BILL_WEEKDAY_UTC:-0}
BILL_HOUR_UTC=${BILL_HOUR_UTC:-18}

log() {
    echo "[cron] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

bill_service_fee() {
    if ! response=$(wget -q -O - --post-data="" \
        --header="Authorization: Bearer ${CRON_SECRET}" \
        "${BILL_SERVICE_FEE_URL}" 2>&1); then
        log "GAGAL bill-service-fee: ${response}"
        return 1
    fi

    log "bill-service-fee: ${response}"
}

seconds_until_next_run() {
    now=$(date -u +%s)
    today_at=$(date -u -d "$(date -u +%Y-%m-%d) ${BILL_HOUR_UTC}:00" +%s)
    days_ahead=$(((BILL_WEEKDAY_UTC - $(date -u +%w) + 7) % 7))
    next=$((today_at + days_ahead * 86400))

    if [ "${next}" -le "${now}" ]; then
        next=$((next + 7 * 86400))
    fi

    echo $((next - now))
}

case "${1:-loop}" in
    once)
        bill_service_fee
        ;;
    loop)
        # sleep dijalankan di background supaya docker stop langsung memutusnya.
        trap 'exit 0' TERM INT
        log "bill-service-fee tiap hari ke-${BILL_WEEKDAY_UTC} (0 = Minggu) jam ${BILL_HOUR_UTC}:00 UTC"

        while true; do
            wait_seconds=$(seconds_until_next_run)
            log "run berikutnya dalam ${wait_seconds} detik"
            sleep "${wait_seconds}" &
            wait $!
            bill_service_fee || true
        done
        ;;
    *)
        echo "pemakaian: mygerai-cron once|loop" >&2
        exit 2
        ;;
esac
