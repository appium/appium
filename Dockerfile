FROM alpine:3.19.1
FROM node:18-alpine


ENV DEBIAN_FRONTEND=noninteractive

#==================
# General Packages
#------------------
# ca-certificates
#   SSL client
# curl
#   Transfer data from or to a server
# gnupg
#   Encryption software. It is needed for nodejs
# libgconf-2-4 (not available in alpine)
#   Required package for chrome and chromedriver to run on Linux
# libqt5webkit5 (not available in alpine)
#   Web content engine (Fix issue in Android)
# openjdk-11-jdk
#   Java
# sudo
#   Sudo user
# tzdata
#   Timezone
# unzip
#   Unzip zip file
# wget
#   Network downloader
# xvfb
#   X virtual framebuffer
# zip
#   Make a zip file
#==================
RUN apk update && apk add --no-cache \
    ca-certificates \
    curl \
    gnupg \
    openjdk11 \
    sudo \
    tzdata \
    unzip \
    wget \
    openjdk11 \
    xvfb-run \
    bash \
    rsync \
    zip \
    && rm -rf /var/cache/apk/*
#===============
# Set JAVA_HOME
#===============


ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk \
    PATH=$PATH:$JAVA_HOME/bin

#===============================
# Set Timezone (UTC as default)
#===============================
ENV TZ=UTC
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/${TZ} /etc/localtime && \
    echo "${TZ}" > /etc/timezone && \
    apk del tzdata


#===============
# Create a user
#===============
ARG USER_PASS=secret
RUN addgroup -g 1301 androidusr && \
    adduser -u 1300 -G androidusr -D -s /bin/sh androidusr && \
    echo 'androidusr ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers

WORKDIR /home/androidusr

#=====================
# Install Android SDK
#=====================
ENV SDK_VERSION=commandlinetools-linux-8512546_latest
ENV ANDROID_BUILD_TOOLS_VERSION=34.0.0
ENV ANDROID_FOLDER_NAME=cmdline-tools
ENV ANDROID_DOWNLOAD_PATH=/home/androidusr/${ANDROID_FOLDER_NAME} \
    ANDROID_HOME=/opt/android \
    ANDROID_TOOL_HOME=/opt/android/${ANDROID_FOLDER_NAME}

RUN wget -O tools.zip https://dl.google.com/android/repository/${SDK_VERSION}.zip && \
    unzip tools.zip && rm tools.zip && \
    chmod a+x -R ${ANDROID_DOWNLOAD_PATH} && \
    chown -R 1300:1301 ${ANDROID_DOWNLOAD_PATH} && \
    mkdir -p ${ANDROID_TOOL_HOME} && \
    mv ${ANDROID_DOWNLOAD_PATH} ${ANDROID_TOOL_HOME}/tools
ENV PATH=$PATH:${ANDROID_TOOL_HOME}/tools:${ANDROID_TOOL_HOME}/tools/bin

# https://askubuntu.com/questions/885658/android-sdk-repositories-cfg-could-not-be-loaded
RUN mkdir -p ~/.android && \
    touch ~/.android/repositories.cfg && \
    echo y | sdkmanager "platform-tools" && \
    echo y | sdkmanager "build-tools;$ANDROID_BUILD_TOOLS_VERSION" && \
    mv ~/.android .android && \
    chown -R 1300:1301 .android
ENV PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools

#====================================
# Install appium and costomize it 
#====================================

WORKDIR /appium-fork

COPY . /appium-fork

# build appium with custom patches 
RUN npm i  && \
    echo "Appium build completed"


# install appium 
ENV APPIUM_VERSION=2.5.0
RUN npm install -g appium@$APPIUM_VERSION && \
    npm cache clean --force && \
    rm -rf /tmp/* /var/cache/apk/*

# Copy custom mcloud patches
RUN cp -r -v /appium-fork/node_modules/@appium/base-driver/build/lib/* /usr/local/lib/node_modules/appium/node_modules/@appium/base-driver/build/lib/ && \ 
    cp -r -v /appium-fork/packages/appium/build/lib/* /usr/local/lib/node_modules/appium/build/lib 


# ====================================================
# Fix permission issue to download e.g. chromedriver
# ====================================================
RUN chown -R 1300:1301 /usr/local/lib/node_modules/appium



# =======
# Add ADB
# =======
RUN apk add \
    android-tools \
    --repository=http://dl-cdn.alpinelinux.org/alpine/edge/testing


#==================
# Use created user
#==================
USER 1300:1301

ENV APPIUM_DRIVER_UIAUTOMATOR2_VERSION="2.45.0"
ENV APPIUM_DRIVER_XCUITEST_VERSION="7.7.2"
RUN appium driver install --source=npm appium-uiautomator2-driver@${APPIUM_DRIVER_UIAUTOMATOR2_VERSION} && \
    appium driver install --source=npm appium-xcuitest-driver@${APPIUM_DRIVER_XCUITEST_VERSION}

#===============
# Expose Port
#---------------
# 4723
#   Appium port
#===============
EXPOSE 4723



#==============
# Start script
#==============

CMD ["bash", "/appium-fork/appium-scripts/start.sh"]
