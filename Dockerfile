ARG BASE_IMAGE

FROM ${BASE_IMAGE}

WORKDIR /home

COPY build.sh build.sh
COPY create_github_repo.sh create_github_repo.sh
COPY .env .env

CMD ["bash", "/home/create_github_repo.sh"]