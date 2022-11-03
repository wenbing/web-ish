FROM alpine:3.13 AS BUILD
RUN sed -i "s@dl-cdn.alpinelinux.org@repo.huaweicloud.com@g" /etc/apk/repositories \
    && apk add --update --no-cache nodejs npm
WORKDIR /web-ish-build
COPY package*.json .npmrc ./
RUN npm i
COPY client client
COPY server server 
COPY bootstrap bootstrap 
RUN NODE_ENV=production node server/build.js

FROM alpine:3.13
RUN sed -i "s@dl-cdn.alpinelinux.org@repo.huaweicloud.com@g" /etc/apk/repositories \
    && apk add --update --no-cache nodejs npm
ENV NODE_ENV=production
EXPOSE 8000
WORKDIR /web-ish-server
COPY --from=BUILD /web-ish-build/package*.json /web-ish-build/.npmrc ./
RUN npm i
COPY --from=BUILD /web-ish-build/public public
COPY --from=BUILD /web-ish-build/server_lib server_lib
COPY --from=BUILD /web-ish-build/server server
COPY --from=BUILD /web-ish-build/bootstrap bootstrap
CMD ./bootstrap