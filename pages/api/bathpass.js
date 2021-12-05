// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import uid from 'short-uid'
import { Queue } from '@datastructures-js/queue'

export default function bathpassAPI(req, res) {
  let _rooms = [
    {
      title: 'A',
      queue: new Queue()
    },
    {
      title: 'B',
      queue: new Queue()
    },
    {
      title: 'C',
      queue: new Queue()
    }
  ]

  const { method } = req;

  if (method === "GET") {
    // console.log(req.query)
    // console.log(room)
    // if(room != undefined) {
    //   rooms[room].enqueue(`UID: ${uid.generate()} | Bathroom: ${room}`)
    //   return res.status(200).json({ msg: `You are now in line for bathroom ${room}` })
    // }
    let rooms = _rooms.map(x => x.title);
    let waiting_list = _rooms.map(x => x.queue.size()).reduce((sum, val) => sum + val, 0) || 0;
    let next_appointment = waiting_list * 1.2;
    return res.status(200).json({ rooms, waiting_list, next_appointment });
  }

  if (method === "POST") {
    const { body } = req;
   
    return res.status(200).json(rooms);
  }
}
