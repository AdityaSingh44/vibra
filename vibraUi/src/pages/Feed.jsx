import React, { useEffect, useState } from 'react'
import axios from 'axios'
import '../styles.css'
import Compose from '../components/Compose'
import PostCard from '../components/PostCard'
import StoriesTray from '../components/StoriesTray'

export default function Feed() {
    const [posts, setPosts] = useState([])
    const [stories, setStories] = useState([])

    const fetchPosts = async () => {
        try { const r = await axios.get('http://localhost:4000/api/posts'); setPosts(r.data) } catch (err) { console.error(err) }
    }

    const fetchStories = async () => {
        try { const r = await axios.get('http://localhost:4000/api/posts/stories'); setStories(r.data) } catch (err) { console.error(err) }
    }

    useEffect(() => { fetchPosts() }, [])

    useEffect(() => { fetchStories() }, [])

    return (
        <div>
            <div className="container">
                <StoriesTray stories={stories} onStoriesUpdated={fetchStories} />
                <div className="layout">
                    <div className="left">
                        <Compose onPosted={fetchPosts} />
                        {posts.map(p => <PostCard key={p._id} post={p} onDeleted={fetchPosts} />)}
                    </div>
                    <div className="right">
                        <div className="card">Right column (recommendations)</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
