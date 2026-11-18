# Versi mayor sama dengan service db, supaya pg_dump cocok dengan server.
FROM postgres:17

COPY --chmod=0755 backup.sh /usr/local/bin/mygerai-backup

ENTRYPOINT ["mygerai-backup"]
CMD ["loop"]
