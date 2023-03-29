ARG BASE_IMAGE

FROM ${BASE_IMAGE}

WORKDIR /app
COPY build/build.sh build.sh
COPY create_github_repo.sh create_github_repo.sh

CMD ["bash", "/app/create_github_repo.sh"]