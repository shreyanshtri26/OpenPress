export type AdProduct = {
  id: string
  name: string
  availability: string
  price: string
  imageUrl: string
  imageAlt: string
}

export const adProducts: AdProduct[] = [
  {
    id: 'coastal-bedroom-set',
    name: 'Coastal bedroom set',
    availability: 'In store',
    price: '₹2,699',
    imageUrl:
      'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcRidwWeSyKkEIQWRKcnOT1DQ1YofphPozkVRk8eWzygBua7TjNWilcRWujeyRx_MD9JKCHlc1VUScqnpLsqMrArYj7auSeDO2XDM_05D6A',
    imageAlt: 'Bright bedroom with wooden bed frame and plants by the window.',
  },
  {
    id: 'sunlit-workspace-desk',
    name: 'Sunlit workspace desk',
    availability: 'In store',
    price: '₹3,799',
    imageUrl:
      'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcRDAmLNHdpdmNB4uH4YnyXF5kOOWXXCc1tLvH9wuGlBmF0P3G5CAVilDFGxuZmZKWLqrjtFSj1Bxz8UJbYvWbidpxw549ni2TyFLUPx0nlo',
    imageAlt: 'Home office setup with wooden desk facing a large sunny window.',
  },
  {
    id: 'heritage-wooden-bed',
    name: 'Heritage wooden bed',
    availability: 'In store',
    price: '₹3,279',
    imageUrl:
      'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcR6MFzxJXCQA2bczko0hR85Q6DAiKXNitnr8xCYWbzLFZVTcAV_EjcDS7ExN4a8gwyoqYpwO1WHuRfR3AJkTigSLp-Q9IcaSPzTTG-i5CIb',
    imageAlt: 'Minimalist bedroom with wooden bed frame and neutral textiles.',
  },
  {
    id: 'adjustable-standing-desk',
    name: 'Adjustable standing desk',
    availability: 'In store',
    price: '₹3,279',
    imageUrl:
      'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRhr2RewDVqJDEeGts2pNbozPTnnnBlyiBo84pC4B1Zgat7IkEAVTgRqyx6yZXWCvmNvEjjjOy-TglzHHlnVEoV4uLiFR1S6HQei5nl4BWo',
    imageAlt: 'Adjustable wood standing desk with built-in power outlets.',
  },
]

export const adProductOptions = adProducts.map((product) => ({
  label: product.name,
  value: product.id,
}))

export function findAdProductById(id: string) {
  return adProducts.find((product) => product.id === id)
}
