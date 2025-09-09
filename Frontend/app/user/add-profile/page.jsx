'use client'
import ProfileCard from '@/components/User/ProfileCard'
import useUserId from '@/hooks/useUserId';
import { getUserDetails } from '@/store/user-slice';
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

const page = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.userprofile);
  const userId = useUserId();

  useEffect(() => {
      dispatch(getUserDetails(userId)); 
  }, [dispatch])

  return (
    <div className='mt-2 dark:bg-gray-800 min-w-full'>
        <ProfileCard userProfileData={userData} />
    </div>
  )
}

export default page
