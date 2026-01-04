import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

type Todo = {
  id: number
  task: string
  is_complete: boolean
  user_id?: string  // optional នៅ type ព្រោះ Supabase return មក
  created_at?: string
}

function App() {
  const [user, setUser] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [task, setTask] = useState('')
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)

  // Check session នៅដំបូង និង listen auth changes
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

  // Fetch todos របស់ user បច្ចុប្បន្ន
  const fetchTodos = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch error:', error)
    } else {
      setTodos(data ?? [])
    }
  }

  const signUp = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin, // optional: redirect ក្រោយ confirm
      },
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

  const addTodo = async () => {
    if (!task.trim()) return

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      alert('You must be logged in!')
      return
    }

    const { data, error } = await supabase
      .from('todos')
      .insert({
        task: task.trim(),
        is_complete: false,
        user_id: user.id, // ← សំខាន់បំផុតសម្រាប់ RLS!
      })
      .select()
      .single() // return object តែមួយ មិនមែន array

    if (error) {
      console.error('Insert error:', error)
      alert('Error: ' + error.message)
    } else if (data) {
      setTodos([data, ...todos])
      setTask('')
    }
  }

  const toggleTodo = async (id: number, current: boolean) => {
    const { error } = await supabase
      .from('todos')
      .update({ is_complete: !current })
      .eq('id', id)

    if (error) {
      console.error('Update error:', error)
    } else {
      setTodos(todos.map(t => t.id === id ? { ...t, is_complete: !current } : t))
    }
  }

  // UI សម្រាប់ Login / Sign Up
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8">Supabase Todos Test</h1>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-4">
            <button
              onClick={signUp}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded transition"
            >
              Sign Up
            </button>
            <button
              onClick={signIn}
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded transition"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  // UI សម្រាប់ Todos
  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Todos</h1>
        <button
          onClick={signOut}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded transition"
        >
          Sign Out
        </button>
      </div>

      <div className="flex gap-3 mb-8">
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
          className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded transition text-lg"
        >
          Add
        </button>
      </div>

      {todos.length === 0 ? (
        <p className="text-center text-gray-500 text-xl py-10">No todos yet! Add one above 👆</p>
      ) : (
        <ul className="space-y-3">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <input
                type="checkbox"
                checked={todo.is_complete}
                onChange={() => toggleTodo(todo.id, todo.is_complete)}
                className="w-6 h-6 text-green-600 rounded focus:ring-green-500"
              />
              <span
                className={`flex-1 text-lg ${
                  todo.is_complete ? 'line-through text-gray-500' : 'text-gray-800'
                }`}
              >
                {todo.task}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default App