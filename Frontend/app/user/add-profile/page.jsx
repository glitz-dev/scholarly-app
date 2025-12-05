'use client'
import ProfileCard from '@/components/User/ProfileCard'
import { getUserDetails } from '@/store/user-slice';
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

const page = () => {

  return (
    <div className='mt-2 dark:bg-gray-800 min-w-full'>
        <ProfileCard  />
    </div>
  )
}

export default page
