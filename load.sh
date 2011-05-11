#!/bin/sh

# Allow running the script and specifiying an install target
#   ./load.sh node-address:host
if [ -n "$1" ] ; then
  node=$1
else
  node="127.0.0.1:8098"
fi

function storeInRiak {
    echo "Storing $1 as $2";
    curl -X PUT "http://$node/riak/$1" -H "Content-Type: $2" --data-binary @$1
}

for file in yak/*.html; do
    storeInRiak $file 'text/html'
done

for file in yak/*.js; do
    storeInRiak $file 'application/javascript'
done

for file in yak/*.css; do
    storeInRiak $file 'text/css'
done

for file in yak/*.png; do
    storeInRiak $file 'image/png'
done

for file in yakmr/*; do
    storeInRiak $file 'application/javascript'
done
