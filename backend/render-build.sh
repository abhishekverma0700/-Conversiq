#!/usr/bin/env bash

pip install --upgrade pip==24.0
pip install setuptools wheel

pip install --only-binary=:all: tiktoken==0.4.0

pip install -r requirements.txt