import Head from "next/head";
import { useState } from "react";
import { OfficeBuildingIcon } from "@heroicons/react/outline";

const nextAppointment = 15;

export async function getStaticProps(context) {
  const res = await fetch(`http://localhost:3000/api/bathpass`)
  const data = await res.json()

  if (!data) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    }
  }

  return {
    props: { data }, // will be passed to the page component as props
  }
}
export default function Home(props) {
  const [room, setRoom] = useState("");
  const waitingList = props.data.waiting_list;
  return (
    <div className="flex flex-col">
      <Head>
        <title>BathPass</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <header className="text-center py-4 bg-[orange]">
        <h1 className="text-6xl text-white font-bold">BathPass+</h1>
        <p>Slighty shorter lines @ the bathroom</p>
      </header>
      <main className="space-y-3 pt-3">
        <figure className="py-6 flex flex-col flex-grow space-y-10 text-center jusify-center">
          {
            (waitingList > 0) ? (<h1 className="uppercase">Another opening will be available in <br></br><span className="text-[orange] font-medium">{props.data.next_appointment}</span> mins</h1>) : (<h1 className="uppercase">Bathrooms are open, hurry up</h1>)
          }
            <h1 className={ waitingList > 0 ? "text-8xl font-bold" : "text-8xl font-bold text-[darkorange]" }>{ waitingList }</h1>
            <p className="uppercase text-[darkorange]">People ahead of you</p>
        </figure>
        <figure className="bg-gray-100">
          <ul className="space-y-4 p-2">
              { props.data.rooms.map((_room, index) => (
                <li key={index}>
                  <button className="flex items-center py-3 w-full space-x-4 focus:border-4 focus:border-black" onClick={() => setRoom(_room)}>
                    <OfficeBuildingIcon className="h-8 text-[darkorange]" />
                    <div className="flex flex-col">
                      <h1 className="text-lg font-medium">" Bathroom {_room} "</h1>
                      <p className="text-gray-600">{index + 2}/5 Capacity</p>
                    </div>
                  </button>
                </li>
            ))}
          </ul>
        </figure>
      </main>
      <footer className="object-none object-bottom bottom-0"> 
        <button className="text-white w-full bg-black h-24" onClick={() => fetch(`/api/bathpass/${room}`)}> 
          Book Appointment to Bathroom
        </button>
      </footer>
    </div>
  );
}
