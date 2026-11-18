# Pemanggil endpoint /api/cron/* terjadwal. Cukup busybox (sh, date, wget) bawaan alpine.
FROM alpine:3.22

COPY --chmod=0755 cron.sh /usr/local/bin/mygerai-cron

ENTRYPOINT ["mygerai-cron"]
CMD ["loop"]
