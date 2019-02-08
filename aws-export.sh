# aws-export.sh (creates lambda, server, and samcli projects from aws-common and other aws projects)
# aws-common
#
# Created by David Vallas. (david_vallas@yahoo.com) (dcvallas@twitter)
# Copyright © 2019 Fenix Labs.
#
# All Rights Reserved.

# Note, this application uses jq (brew install jq)

#!/bin/bash

# check if we aren't making export files

# create exports directory

while getopts "o:" opt; do
  case $opt in
    o) OPTION=$OPTARG;;
    *) exit 1
  esac
done

# create exports directory

if [ -d ../exports ]; then
  if [[ ${OPTION} != 'nozip' ]]; then
    rm -R ../exports/* 2> /dev/null
  fi
else
  mkdir ../exports 2> /dev/null
fi

# create samcli directory and copy yaml

if [ ! -d ../samcli ]; then
  mkdir ../samcli
  if [[ ${OPTION} != 'nozip' ]]; then
    cp ./template.yaml ../samcli/. 2> /dev/null
  fi
fi

# create variables for current directory and aws directories

COMMONDIR=`pwd`
cd ..
AWS_DIRECTORIES=(aws-*)

# copy files for export directory
cd exports
cp -R ${COMMONDIR}/common . 2> /dev/null
cp ${COMMONDIR}/lambda.js . 2> /dev/null
cp ${COMMONDIR}/app.js . 2> /dev/null



# iterate AWS_DIRECTORIES and create AWS lambda and server zip files
for directory in "${AWS_DIRECTORIES[@]}"
do

  # copy request handler to exports
  cp ../${directory}/actionHandler.js . 2> /dev/null
  cp ../${directory}/actionCommon.js . 2> /dev/null
  cp -R ../${directory}/actions . 2> /dev/null
  cp -R ../${directory}/documents . 2> /dev/null

  # create lambda zip list
  find common > lambda.list
  find actions >> lambda.list
  find documents >> lambda.list
  echo "actionHandler.js" >> lambda.list
  echo "actionCommon.js" >> lambda.list
  echo "lambda.js" >> lambda.list

  # create server zip list
  find common > server.list
  find actions >> server.list
  find documents >> server.list
  echo "actionHandler.js" >> server.list
  echo "actionCommon.js" >> server.list
  echo "lambda.js" >> server.list
  echo "app.js" >> server.list
  echo "package.json" >> server.list

  if [[ ${OPTION} != 'nozip' ]]; then

    # copy lambda common package
    cp ${COMMONDIR}/aws-lambda-package.json .  2> /dev/null

    # merge two packages if they exist or just make one package
    if [ -f ../${directory}/package.json ]; then
      cp ../${directory}/package.json ./local-package.json 2> /dev/null
      jq -s 'reduce .[] as $d ({}; . *= $d)' $(find . -name "*-package.json") > package.json
      rm ./local-package.json 2> /dev/null
    else
      cp aws-lambda-package.json package.json 2> /dev/null
    fi

    # install package
    npm install --only=production

    # add node_modules to lambda list
    find node_modules >> lambda.list

    # create a zip file for lambda
    cat lambda.list | zip -@ aws-lambda-${directory}.zip > /dev/null

    # create sam cli directory with node modules
    rm -R ../samcli/${directory} 2> /dev/null
    mkdir ../samcli/${directory} 2> /dev/null
    cp -R ./node_modules ../samcli/${directory}/. 2> /dev/null
  fi

  # create samcli (if necessary) and copy files
  mkdir ../samcli/${directory} 2> /dev/null
  cp -R ./common ../samcli/${directory}/. 2> /dev/null
  rm -R ../samcli/${directory}/actions 2> /dev/null
  rm -R ../samcli/${directory}/documents 2> /dev/null
  cp -R ./actions ../samcli/${directory}/. 2> /dev/null
  cp -R ./documents ../samcli/${directory}/. 2> /dev/null
  cp ./lambda.js ../samcli/${directory}/. 2> /dev/null
  cp ./actionHandler.js ../samcli/${directory}/. 2> /dev/null
  cp ./actionCommon.js ../samcli/${directory}/. 2> /dev/null
  cp ./package.json ../samcli/${directory}/. 2> /dev/null
  cp ./package-lock.json ../samcli/${directory}/. 2> /dev/null
  cp ${COMMONDIR}/aws-config.json ../samcli/${directory}/. 2> /dev/null

  # remove lambda-package
  rm aws-lambda-package.json 2> /dev/null 2> /dev/null
  rm package-lock.json 2> /dev/null 2> /dev/null
  rm -R node_modules 2> /dev/null 2> /dev/null

  if [[ ${OPTION} != 'nozip' ]]; then

    # copy server-package
    cp ${COMMONDIR}/aws-server-package.json . 2> /dev/null

    # merge two packages if they exist or just make one package
    if [ -f ../${directory}/package.json ]; then
      cp ../${directory}/package.json ./local-package.json 2> /dev/null
      jq -s 'reduce .[] as $d ({}; . *= $d)' $(find . -name "*-package.json") > package.json
      rm ./local-package.json 2> /dev/null
    else
      cp aws-server-package.json package.json
    fi

    # create a zip file for server
    cat server.list | zip -@ aws-server-${directory}.zip > /dev/null

    # remove server-package
    rm aws-server-package.json 2> /dev/null

  fi

  rm -R actions 2> /dev/null
  rm -R documents 2> /dev/null
  rm actionHandler.js 2> /dev/null
  rm actionCommon.js 2> /dev/null

done

# remove extra files

rm -R common 2> /dev/null
rm package.json 2> /dev/null
rm lambda.js 2> /dev/null
rm app.js 2> /dev/null
rm lambda.list 2> /dev/null
rm server.list 2> /dev/null

echo "Builds completed"

exit 0
