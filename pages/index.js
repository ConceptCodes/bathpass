import Head from "next/head";
import { OfficeBuildingIcon } from "@heroicons/react/outline";

const bathroom = [
  {
    title: 'A',
    selected: false
  },  {
    title: 'B',
    selected: false
  },  {
    title: 'C',
    selected: false
  }
]

export async function getStaticProps(context) {
  const res = await fetch(`/api/bathpass`)
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
export default function Home() {
  function ReserveBathroom(bathroom) { 
    return `${bathroom.title} has been reserved successfully`
  }
  
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
      <main className="space-y-3 py-3">
        <figure className="py-6 flex flex-col flex-grow space-y-10 text-center jusify-center">
          <h1 className="uppercase">Another opening will be available in <br></br><span className="text-[orange] font-medium">23</span> mins</h1>
            <h1 className="text-8xl font-bold">12</h1>
            <p className="uppercase text-[darkorange]">People ahead of you</p>
        </figure>
        <figure className="bg-gray-100">
          <ul className="space-y-4 p-2">
              { bathroom.map((key, index) => (
                <li key={index}>
                  <button className="flex items-center py-3 w-full space-x-4 focus:border-4 focus:border-black" onClick={() => this.ReserveBathroom(key)}>
                    <OfficeBuildingIcon className="h-8 text-[darkorange]" />
                    <div className="flex flex-col">
                      <h1 className="text-lg font-medium">" Bathroom {key.title} "</h1>
                      <p className="text-gray-600">{index + 2}/5 Capacity</p>
                    </div>
                  </button>
                </li>
            ))}
          </ul>
        </figure>
      </main>
      <footer className="object-none object-bottom bottom-0 z-50"> 
        <button className="text-white w-full bg-black h-24"> 
          Book Appointment to Bathroom
        </button>
      </footer>
    </div>
  );
}
