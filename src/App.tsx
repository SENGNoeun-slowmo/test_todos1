import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'

type Todo = {
  id: number
  task: string
  is_complete: boolean
  user_id?: string
  image_url: string | null  // អាច null បានបើគ្មានរូប
  created_at?: string
}

function App() {
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [task, setTask] = useState('')
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // សម្រាប់ជ្រើសរើសរូបភាព + preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check session និង listen auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchTodos()
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchTodos()
      } else {
        setTodos([])
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const fetchTodos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) console.error('Fetch error:', error)
    else setTodos(data ?? [])
  }

  const signUp = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) alert(error.message)
    else alert('Check your email for confirmation link!')
    setLoading(false)
  }

  const signIn = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    setLoading(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setTodos([])
  }

  // Handle ជ្រើសរើស file → preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  // Upload រូបភាពទៅ Storage និង return public URL
  const uploadImage = async (file: File): Promise<string | null> => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return null

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}` // unique path

    const { data, error } = await supabase.storage
      .from('todo-images') // ← ឈ្មោះ bucket របស់អ្នក
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (error) {
      console.error('Upload error:', error)
      alert('Image upload failed: ' + error.message)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('todo-images')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  }

  const addTodo = async () => {
    if (!task.trim()) return

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      alert('You must be logged in!')
      return
    }

    setUploading(true)

    let imageUrl: string | null = null
    if (selectedFile) {
      imageUrl = await uploadImage(selectedFile)
    }

    const { data, error } = await supabase
      .from('todos')
      .insert({
        task: task.trim(),
        is_complete: false,
        user_id: user.id,
        image_url: imageUrl, // null បើគ្មានរូប
      })
      .select()
      .single()

    setUploading(false)

    if (error) {
      console.error('Insert error:', error)
      alert('Error: ' + error.message)
    } else if (data) {
      setTodos([data, ...todos])
      setTask('')
      setSelectedFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const toggleTodo = async (id: number, current: boolean) => {
    const { error } = await supabase
      .from('todos')
      .update({ is_complete: !current })
      .eq('id', id)

    if (error) console.error('Update error:', error)
    else {
      setTodos(todos.map(t => t.id === id ? { ...t, is_complete: !current } : t))
    }
  }

  // Login UI
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8">Supabase Todos Test</h1>
        <div className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex gap-4">
            <button onClick={signUp} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded transition">Sign Up</button>
            <button onClick={signIn} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded transition">Sign In</button>
          </div>
        </div>
      </div>
    )
  }

  // Todos UI
  return (
    <div className="max-w-4xl mx-auto mt-10 p-8 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Todos</h1>
        <button onClick={signOut} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded transition">Sign Out</button>
      </div>

      {/* Add Todo Form */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            className="flex-1 p-4 text-lg border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={addTodo}
            disabled={uploading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded transition text-lg disabled:opacity-50"
          >
            {uploading ? 'Adding...' : 'Add'}
          </button>
        </div>

        {/* Image Upload + Preview */}
        <div className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {previewUrl && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-1">Preview:</p>
              <img src={previewUrl} alt="Preview" className="max-h-64 rounded-lg shadow" />
            </div>
          )}
        </div>

<grok-card data-id="7beff2" data-type="image_card"  data-arg-size="LARGE" ></grok-card>



<grok-card data-id="f97483" data-type="image_card"  data-arg-size="LARGE" ></grok-card>

      </div>

      {/* Todo List */}
      {todos.length === 0 ? (
        <p className="text-center text-gray-500 text-xl py-10">No todos yet! Add one above 👆</p>
      ) : (
        <ul className="space-y-6">
          {todos.map((todo) => (
            <li key={todo.id} className="flex flex-col gap-4 p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={todo.is_complete}
                  onChange={() => toggleTodo(todo.id, todo.is_complete)}
                  className="mt-1 w-6 h-6 text-green-600 rounded focus:ring-green-500"
                />
                <span className={`flex-1 text-lg ${todo.is_complete ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                  {todo.task}
                </span>
              </div>
              {todo.image_url && (
                <img src={todo.image_url} alt="Todo image" className="max-w-md rounded-lg shadow" />
              )}
            </li>
          ))}
        </ul>
      )}

<grok-card data-id="5d78e8" data-type="image_card"  data-arg-size="LARGE" ></grok-card>



<grok-card data-id="537aac" data-type="image_card"  data-arg-size="LARGE" ></grok-card>



<grok-card data-id="2cfb7a" data-type="image_card"  data-arg-size="LARGE" ></grok-card>

    </div>
  )
}

export default App