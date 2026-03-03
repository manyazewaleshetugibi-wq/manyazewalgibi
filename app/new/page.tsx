  "use client"
  
  
  import React, { useState } from 'react'


  export default function newpage(){
  const [count, setCount] = useState(0)

const funcCount=()=>{
setCount((prev)=>prev+1)
  
}


    return(
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500w-screen h-screen items-center flex justify-center flex-col">
            <p>{count}</p>
            <button
            className='bg-gradient-to-r from-yellow-500 to-blue-300 border border-xl rounded rounded-xl' 
            onClick={funcCount}>click me to add</button>
        </div>
    )
  }