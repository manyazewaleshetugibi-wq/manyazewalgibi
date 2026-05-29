   
   "use client"

   import react from 'react';
   import { useState, useEffect } from 'react';


   export default function itemCalculation() {

      
    return(
        <div className=' h-screen w-screen flex flex-col p-4 '>
            <div className='bg-red-100 p-4 m-5 border border-xl border-blue-900 border shadow-xl shadow-gray-500 rounded rounded-l'>
                <div className='flex flex-row'>
                    <button className='w-outo border border-xl border-black border-w-xl rounded rounded-l shadow m-3'>
                        calculate munu price
                    </button>
                    <button className='w-outo border border-xl border-black border-w-xl rounded rounded-l shadow m-3'>
                        calculate munu price
                    </button>
                    <button className='w-outo border border-xl border-black border-w-xl rounded rounded-l shadow m-3'>
                        calculate munu price
                    </button>
                </div>
                <div>
                    <button className='w-outo border border-xl border-black border-w-xl rounded rounded-l shadow m-3'>
                        calculate munu price
                    </button>
                    <button className='w-outo border border-xl border-black border-w-xl rounded rounded-l shadow m-3'>
                        calculate munu price
                    </button>
                    <button className='w-outo border border-xl border-black border-w-xl rounded rounded-l shadow m-3'>
                        calculate munu price
                    </button>
                </div>
             </div>  
             <div className='bg-yellow-300 m-5'>
                  <div>
                    <h1 className='flex-center'>Menu calculation page</h1>
                  </div>
             </div>
        </div>
    );
   }
