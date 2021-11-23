# Pull base image
FROM ubuntu:18.04

# Install Node.js, curl, gcc, make
RUN apt update
RUN apt install --yes curl
RUN curl --silent --location https://deb.nodesource.com/setup_14.x | bash -
RUN apt install --yes nodejs
RUN apt install --yes build-essential
RUN apt install --yes gcc g++ make
RUN apt install --yes git

# Bundle app source
COPY . /src

# Install app dependencies
RUN cd /src ; npm install

# Binds to port 8080
EXPOSE  8080

#  Defines your runtime
CMD ["node", "/src/server/main.js", "localhost", "8080"]