import client from "../connections/mcp_connect.js"

class ZomatoService {
    constructor(mcpClient = client) {
        this.client = mcpClient;
    }

    async getAddressForUserId(addressFilter) {
        try {
            const result = await this.client.call({
                name: "get_saved_addresses_for_user",
                arguments: {}
            });

            const addressList = result.addresses || [];

            const matched = addressList.find((address) =>
                addressFilter(address.location_name.toLowerCase())
            );

            console.log(matched);

            return matched ? matched.address_id : null;

        } catch (error) {
            console.log("Getting address for user id failed");
            throw error;
        }
    }

    async getRestaurantDetails(address_id, keyword = [], page_size, args = {}) {
        try {

            const constructedKeyword = Array.isArray(keyword)
                ? keyword.join(",")
                : keyword;

            console.log(keyword);

            const result = await this.client.call({
                name: "get_restaurants_for_keyword",
                arguments: {
                    address_id,
                    keyword: constructedKeyword,
                    page_size,
                }
            });

            return result;

        } catch (error) {
            console.log("Restaurant details not found");
            throw error;
        }
    }

    async createCart(res_id, items, address_id, payment_type = process.env.PAYMENT_TYPE) {
        try {
            const result = await this.client.call({
                name: "create_cart",
                arguments: {
                    res_id,
                    items,
                    address_id,
                    payment_type
                }
            });

            return result.cart.cart_id;

        } catch (error) {
            console.log("Cart creation failed");
            throw error;
        }
    }

    async checkoutCart(cart_id) {
        try {
            const result = await this.client.call({
                name: "checkout_cart",
                arguments: {
                    cart_id
                }
            });

            return result;

        } catch (error) {
            console.log("Cart checkout failed");
            throw error;
        }
    }
}

export default ZomatoService;