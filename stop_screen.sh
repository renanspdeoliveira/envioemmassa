#!/bin/bash

for session in isp-frontend isp-data-sync isp-backend; do
  if screen -list | grep -q "[.]${session}[[:space:]]"; then
    screen -S "$session" -X quit
    echo "Sessao '${session}' encerrada."
  else
    echo "Sessao '${session}' nao estava em execucao."
  fi
done
