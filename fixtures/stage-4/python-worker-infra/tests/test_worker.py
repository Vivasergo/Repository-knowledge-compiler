from worker.main import consume

def test_worker_symbol_exists():
    assert callable(consume)
