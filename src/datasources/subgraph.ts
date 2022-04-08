import axios from "axios";

export type ICreator = {
    id: string;
    user: string;
    creatorContract: string;
};

export async function getCreators(): Promise<ICreator[]> {
    const query = `{
        creators {
            id
            user
            creatorContract
        }
    }`;

    const response = await axios.post(
        process.env.GRAPH_URI, 
        { query },
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }}
    );

    return response.data.data.creators;
}