#!/bin/sh
mvn clean install > build.log
npm install >> build.log
grunt -v >> build.log
