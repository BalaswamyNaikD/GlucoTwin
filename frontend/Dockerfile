FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG REACT_APP_API_ORIGIN=http://localhost:5000
ARG REACT_APP_API_URL=http://localhost:5000/api
ARG REACT_APP_BOOKING_API_ORIGIN=http://localhost:5001
ARG REACT_APP_BOOKING_API_URL=http://localhost:5001/api

ENV REACT_APP_API_ORIGIN=$REACT_APP_API_ORIGIN \
    REACT_APP_API_URL=$REACT_APP_API_URL \
    REACT_APP_BOOKING_API_ORIGIN=$REACT_APP_BOOKING_API_ORIGIN \
    REACT_APP_BOOKING_API_URL=$REACT_APP_BOOKING_API_URL

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
