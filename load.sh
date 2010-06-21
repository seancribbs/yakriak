#!/bin/sh

function storeInRiak {
    echo "Storing $1 as $2";
    curl -X PUT "http://127.0.0.1:8098/riak/$1" -H "Content-Type: $2" --data-binary @$file
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
