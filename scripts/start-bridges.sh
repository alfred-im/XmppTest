#!/bin/sh
set -e
python bridge-xmpp/main.py &
python bridge-matrix/main.py &
wait
