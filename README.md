# BathPass - Virtual Queue for office bathrooms

A replica of Walt Disneys Fast Pass system for reserving a spot in the batroom. Modeled after [M/M/c](https://en.wikipedia.org/wiki/M/M/c_queue). The Core of the system is a Queue that stores the entries of people who need to use the bathroom 


## Preview

Preview the example live on [BathPass](https://bathpass.conceptcodes.dev):

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/vercel/next.js/tree/canary/examples/with-tailwindcss)

## Setup

```bash
git clone https://github.com/conceptcodes/bathpass
yarn install
yarn dev
```

## Overview of API
|Request  | Endpoint              | Description
|---------|-----------------------|---------------------
| GET     | `/api/bathpass`       | return number of people ahead of you
| GET     | `/api/bathpass/:room` | join queue of selected bathroom, return uid and estimated wait

## How to use
- Scan the QR Code 
- Generate BathPass Reservation for your particular bathroom
- Wait for notfication to let you

## Rodmap
[x] Persistent Database
[x] 