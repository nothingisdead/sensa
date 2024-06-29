# sensa
Control Schlage Sense Smart Locks via Web Bluetooth

## Example Usage

### Pair a new lock

1. Find your pairing code by removing the cover from the indoor side of the lock.
2. Reset the lock by disconnecting the battery, then holding the "Schlage" key on the outdoor side of the lock while connecting the battery.
3. Enter ```[code]0``` (e.g. if your code is "123456", enter "1234560") on the keypad, and wait for the solid orange light.
4. Run the following command:

```node scripts/pair.js [code] > .env.FRONT_DOOR```

If all goes well, you should see output resembling the following:

```
Please enter [code]0 on the keypad
subscribing to receive notifications
getting the RX characteristic
getting the primary service
finished getting the primary service
finished getting the RX characteristic
setting up connection
getting the TX characteristic
finished getting the TX characteristic
sending start pairing message
sending pairing timestamp message
authorizing with temporary auth token
calculating client/server session keys
sending authorization challenge
sent
creating secure session
authorizing secure session
started secure session for lock SENSEABCDEF
claiming ownership of lock
disconnecting
```

Note: If you see ```Request error: 145``` or ```Timed out```, just start over. The timing can be a bit finicky.

### Lock the deadbolt

```node --env-file=.env.FRONT_DOOR scripts/lock.js```

### Unlock the deadbolt

```node --env-file=.env.FRONT_DOOR scripts/unlock.js```

### Set access code length

```node --env-file=.env.FRONT_DOOR scripts/setAccessCodeLength.js 6```

### Get access code length

```node --env-file=.env.FRONT_DOOR scripts/getAccessCodeLength.js```

### Add access code

```node --env-file=.env.FRONT_DOOR scripts/addAccessCode.js 123456```

### Delete access code

```node --env-file=.env.FRONT_DOOR scripts/deleteAccessCode.js 123456```

### Get access codes

```node --env-file=.env.FRONT_DOOR scripts/getAccessCodes.js```
