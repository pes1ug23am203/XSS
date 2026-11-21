FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    bash \
    apache2 \
    php \
    php-mysql \
    mysql-client \
    curl \
    wget \
    netcat \
    net-tools \
    nano \
    vim \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Create a hosts configuration file (actual /etc/hosts is read-only in Docker)
# Users can add entries manually with: echo "10.9.0.5  www.seed-server.com" >> /etc/hosts
RUN echo "# Fake SEED Labs domains - add manually if needed:" > /tmp/hosts-extra && \
    echo "# 10.9.0.5  www.seed-server.com" >> /tmp/hosts-extra && \
    echo "# 10.9.0.5  www.example32a.com" >> /tmp/hosts-extra

# Create seed user like SEED Labs VM
RUN useradd -m -s /bin/bash seed

# Set up working directory
WORKDIR /home/seed
USER seed

CMD ["/bin/bash"]
