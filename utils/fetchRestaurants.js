export default async function fetchRestaurants(req,filter_veg=true){
    const filterFunction = (address)=>{return address.includes(process.env.CITY.toLowerCase())}
    const addressId  =  await this.getAddressForUserId(filterFunction)
    if (addressId){
        const page_size  =  req.page_size ? req.page_size : process.env.PAGE_SIZE 
        const restaurants = await this.getRestaurantDetails(addressId,req.dish,page_size)
        if (filter_veg) {
            restaurants.results = restaurants.results.map(r => ({
            ...r,
            items: r.items.filter(item => item.is_veg)
            })).filter(r => r.items.length > 0); 
        }
        restaurants.dish = req.dish
        restaurants.cuisine = req.cuisine
        return restaurants
    }
    return new Error("address not found")
}

