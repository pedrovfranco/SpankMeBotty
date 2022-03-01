FROM node:17.0.1-buster
# FROM node:14-alpine

# ENV NODE_ENV production

# Install OS deps
RUN apt-get update
RUN apt-get dist-upgrade -y
RUN apt-get autoremove -y
RUN apt-get autoclean
RUN apt-get -y install dirmngr curl software-properties-common locales git cmake
RUN apt-get -y install autoconf automake g++ libtool
RUN apt-get -y install ffmpeg libmp3lame-dev x264

RUN apt-get -y install dumb-init


RUN sed -i 's/^# *\(en_US.UTF-8\)/\1/' /etc/locale.gen
RUN locale-gen
ENV LANG en_US.UTF-8
ENV LC_ALL en_US.UTF-8

EXPOSE 5000
EXPOSE $PORT
EXPOSE 80
EXPOSE 443

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm update

# Add your source files
COPY . .


# CMD ["dumb-init", "npm", "start"]