var Server = require('ws').Server
const wss = new Server({ port: 8888 })
const users = {}

wss.on('listening', () => {
    console.log('Server started...')
})

wss.on('connection', (connection) => {
    let data = {}
    let guestConnection
    console.log('User connected')

    connection.on('message', (message) => {
        try {
            data = JSON.parse(message)
            const { type, name } = data

            switch (type) {
                case 'login':
                    console.log(`User logged in as ${name}`)
                    if (users[name]) {
                        sendMessage(connection, {
                            type: 'login',
                            success: false
                        })
                    } else {
                        users[name] = connection
                        connection.name = name
                        sendMessage(connection, {
                            type: 'login',
                            success: true
                        })
                    }
                    break

                case 'candidate':
                    handleSignaling('candidate', connection, guestConnection, data)
                    break
                        
                case 'offer':
                    handleSignaling('offer', connection, guestConnection, data)
                    break

                case 'answer':
                    handleSignaling('answer', connection, guestConnection, data)
                    break

                case 'leave':
                    console.log(`Disconnecting user from ${data.name}`)
                    guestConnection = users[data.name]
                    guestConnection.otherName = undefined

                    if (guestConnection) {
                        sendMessage(guestConnection, { type: 'leave' })
                    }
                    break
            
                default:
                    sendMessage(connection, {
                        type: 'error',
                        message: `Unrecognized command: ${type}`
                    })
            }
        } catch (e) {
            console.log(e)
        }
    })

    connection.on('close', () => {
        if (connection.name) {
            delete users[connection.name]

            if (connection.otherName) {
                console.log(`Disconnecting user from ${connection.otherName}`)
                guestConnection = users[connection.otherName]
                guestConnection.otherName = undefined

                if (guestConnection) {
                    sendMessage(guestConnection, { type: 'leave' })
                }
            }
        }
    })
})

function handleSignaling(type, connection, guestConnection, data) {
    console.log(`Sending ${type} to ${data.name}`)
    guestConnection = users[data.name]

    if (guestConnection) {
        if (type === 'offer' || type === 'answer') {
            connection.otherName = data.name
        }
        
        sendMessage(guestConnection, {
            type,
            [type]: data[type],
            ...(type === 'offer' ? { name: connection.name } : {})
        })
    }
}

function sendMessage(connection, payload) {
    connection.send(JSON.stringify(payload))
}
