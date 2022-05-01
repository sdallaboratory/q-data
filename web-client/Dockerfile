FROM nginx:1.20.2-alpine

COPY ./nginx.conf /etc/nginx/nginx.conf

COPY ./dist/ /usr/share/nginx/html/

EXPOSE 80

ENTRYPOINT ["nginx", "-g", "daemon off;"]
