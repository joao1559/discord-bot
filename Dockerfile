FROM fredboat/lavalink:master

WORKDIR /opt/Lavalink

COPY application.yml application.yml

EXPOSE 9000
