import json
import sqlite3

def consume(queue, message):
    state = json.loads(message)
    database = sqlite3.connect("worker.db")
    database.execute("insert into events(payload) values (?)", (message,))
    queue.publish("processed", state)
