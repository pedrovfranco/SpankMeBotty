FROM node:20.6.1-buster-slim
# FROM node:14-alpine

# Install OS deps
RUN apt-get update
# RUN apt-get dist-upgrade -y
RUN apt-get autoremove -y
RUN apt-get autoclean
RUN apt-get -y install dirmngr curl software-properties-common locales git cmake
RUN apt-get -y install autoconf automake g++ libtool
RUN apt-get -y install ffmpeg libmp3lame-dev x264

RUN apt-get -y install dumb-init


##################################### yt-dlp python3.10 dependency #####################################

# # For some reason this gets stuck on docker....
# RUN sed -i "precedence ::ffff:0:0/96  100" /etc/gai.conf
# RUN add-apt-repository ppa:deadsnakes/ppa -y
# RUN apt update
# RUN apt-get -y install python3.13


# Build python from source
WORKDIR /tmp/python/
RUN apt-get install -y make build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev
RUN wget https://www.python.org/ftp/python/3.10.0/Python-3.10.0.tar.xz
RUN tar -xf Python-3.10.0.tar.xz
WORKDIR /tmp/python/Python-3.10.0
RUN mkdir output
RUN ./configure --enable-optimizations --prefix=/tmp/python/Python-3.10.0/output
RUN make -j $(nproc)
RUN make altinstall
RUN cp /tmp/python/Python-3.10.0/output/bin/python3.10 /usr/bin/

# Replace python3 binary in /usr/bin
RUN rm -f /usr/bin/python3
RUN cp /tmp/python/Python-3.10.0/output/bin/python3.10 /usr/bin/python3

# Add python3.10 to env variables
ENV PATH="/tmp/python/Python-3.10.0/output/bin:${PATH}"
ENV PATH="/tmp/python/Python-3.10.0/output/lib/python3.10/site-packages:${PATH}"

##################################### yt-dlp python3.10 dependency #####################################


RUN sed -i 's/^# *\(en_US.UTF-8\)/\1/' /etc/locale.gen
RUN locale-gen
ENV LANG en_US.UTF-8
ENV LC_ALL en_US.UTF-8

# EXPOSE 5000
# EXPOSE $PORT
# EXPOSE 80
# EXPOSE 443

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig*.json ./

RUN npm ci --development

# Add your source files
COPY . .

# Build Typescript
RUN npm run clean
RUN npm run build

# RUN rm -rf node_modules
RUN npm ci --omit=dev

# CMD ["dumb-init", "npm", "start"]
# CMD ["npm", "start"]
CMD ["dumb-init", "node", "./lib/main.js"]
