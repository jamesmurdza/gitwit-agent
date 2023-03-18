ARG BASE_IMAGE

FROM ${BASE_IMAGE}

WORKDIR /private
COPY .env .env

WORKDIR /app
COPY build.sh build.sh
COPY create_github_repo.sh create_github_repo.sh

CMD ["bash", "/app/create_github_repo.sh"]