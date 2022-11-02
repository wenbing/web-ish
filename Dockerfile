FROM alpine:3.13

# 使用 HTTPS 协议访问容器云调用证书安装
# RUN apk add ca-certificates

# 选用国内镜像源以提高下载速度

RUN sed -i "s@dl-cdn.alpinelinux.org@repo.huaweicloud.com@g" /etc/apk/repositories \
    && apk add --update --no-cache nodejs npm

ENV NODE_ENV=production
EXPOSE 8000

WORKDIR /web-ish-server
COPY . .
RUN npm i
CMD ./bootstrap