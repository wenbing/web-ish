import React, { Suspense } from 'react'

const AsyncCompnent = React.lazy(() => import('./AsyncComponent'))

function handleClick(e) {
    alert(e.target.textContent)
}

class App extends React.Component {
    static getInitialData() {
        return { time: new Date().toLocaleTimeString() }
    }

    constructor(props) {
        super(props)
        this.state = { time: props.time }
    }
    componentDidMount() {
        this.intervalID = setInterval(this.tick, 1000)
    }
    componentWillUnmount() {
        clearInterval(this.intervalID)
    }
    tick = () => {
        this.setState(App.getInitialData())
    }
    render() {
        return <div>
            <h1>Hello, world!</h1>
            <h2>It is {this.state.time}.</h2>
            <p>The pathname is {this.props.pathname}</p>
            <Suspense fallback={<div>Loading...</div>}>
                <AsyncCompnent />
            </Suspense>
        </div>
    }
}
export default App