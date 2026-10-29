'use client'

import { useState } from 'react'

import { Rating } from '@/components/ui/rating'

const RatingSizeDemo = () => {
  const [yellow, setYellow] = useState(3)
  const [destructive, setDestructive] = useState(2)
  const [secondary, setSecondary] = useState(4)
  const [outline, setOutline] = useState(3)

  return (
    <div className='grid grid-cols-2 gap-6'>
      <div className='flex flex-col items-start gap-3'>
        <div className='text-sm font-medium'>Yellow</div>
        <Rating
          size={24}
          precision={1}
          value={yellow}
          onValueChange={setYellow}
          variant='yellow'
          aria-label='Rating Yellow'
        />
      </div>

      <div className='flex flex-col items-start gap-3'>
        <div className='text-sm font-medium'>Destructive</div>
        <Rating
          size={24}
          precision={1}
          value={destructive}
          onValueChange={setDestructive}
          variant='destructive'
          aria-label='Rating Destructive'
        />
      </div>

      <div className='flex flex-col items-start gap-3'>
        <div className='text-sm font-medium'>Secondary</div>
        <Rating
          size={24}
          precision={1}
          value={secondary}
          onValueChange={setSecondary}
          variant='secondary'
          aria-label='Rating Secondary'
        />
      </div>

      <div className='flex flex-col items-start gap-3'>
        <div className='text-sm font-medium'>Outline</div>
        <Rating
          size={24}
          precision={1}
          value={outline}
          onValueChange={setOutline}
          variant='outline'
          aria-label='Rating Outline'
        />
      </div>
    </div>
  )
}

export default RatingSizeDemo
