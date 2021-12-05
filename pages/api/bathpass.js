// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import uid from 'short-uid'
import { Queue } from '@datastructures-js/queue'

export default function bathpassAPI(req, res) {
  let rooms = {
    'A': Queue(),
    'B': Queue(),
    'C': Queue(),
  }

  const { method } = request;

  if (method === "GET") {
    const { params } = request;
    console.log(params)
    // rooms[params.room].enqueue(`UID: ${uid.generate()} | Bathroom: ${body.room}`)
    return response.status(200).json(rooms);
  }

  if (method === "POST") {
    const { body } = request;
   
    return response.status(200).json(rooms);
  }
}
