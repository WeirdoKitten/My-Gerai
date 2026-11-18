#!/bin/sh
# Menulis backup database MyGerai (format custom pg_dump) ke /backups.
#
#   mygerai-backup once   dump sekarang, lalu terapkan retensi
#   mygerai-backup loop   dump tiap hari jam BACKUP_HOUR_UTC:00 UTC (default)
#
# Koneksi memakai variabel standar PGHOST, PGDATABASE, PGUSER, dan PGPASSWORD.
# Dump yang lebih tua dari BACKUP_RETENTION_DAYS baru dihapus setelah dump berhasil, jadi
# rentetan kegagalan tidak pernah menghapus backup bagus terakhir.
set -eu

BACKUP_DIR=/backups
BACKUP_HOUR_UTC=${BACKUP_HOUR_UTC:-19}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

log() {
    echo "[backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

dump() {
    target="${BACKUP_DIR}/mygerai-$(date -u +%Y%m%d-%H%M%S).dump"

    rm -f "${BACKUP_DIR}"/*.partial

    # Ditulis dengan nama sementara, supaya dump yang terputus tidak terlihat seperti dump utuh.
    if ! pg_dump -Fc --file="${target}.partial"; then
        rm -f "${target}.partial"
        log "GAGAL: pg_dump keluar dengan error"
        return 1
    fi

    mv "${target}.partial" "${target}"
    log "menulis ${target} ($(du -h "${target}" | cut -f1))"

    # Kelonggaran satu jam supaya dump yang tepat BACKUP_RETENTION_DAYS hari lalu ikut terhapus.
    find "${BACKUP_DIR}" -maxdepth 1 -name 'mygerai-*.dump' \
        -mmin +$((BACKUP_RETENTION_DAYS * 1440 - 60)) -print -delete |
        while read -r removed; do
            log "menghapus ${removed}"
        done
}

seconds_until_next_run() {
    now=$(date -u +%s)
    next=$(date -u -d "$(date -u +%Y-%m-%d) ${BACKUP_HOUR_UTC}:00" +%s)

    if [ "${next}" -le "${now}" ]; then
        next=$((next + 86400))
    fi

    echo $((next - now))
}

case "${1:-loop}" in
    once)
        dump
        ;;
    loop)
        # sleep dijalankan di background supaya docker stop langsung memutusnya.
        trap 'exit 0' TERM INT
        log "dump harian jam ${BACKUP_HOUR_UTC}:00 UTC, simpan ${BACKUP_RETENTION_DAYS} hari"

        while true; do
            wait_seconds=$(seconds_until_next_run)
            log "dump berikutnya dalam ${wait_seconds} detik"
            sleep "${wait_seconds}" &
            wait $!
            dump || true
        done
        ;;
    *)
        echo "pemakaian: mygerai-backup once|loop" >&2
        exit 2
        ;;
esac
