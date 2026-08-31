import json
from pathlib import Path

incidents = json.loads(Path('/tmp/incidents-all.json').read_text())
history = json.loads(Path('/tmp/history-all.json').read_text())

incident_headers = [
    'id', 'incident_date', 'risk_type', 'process_type', 'risk_items',
    'other_risk_item', 'incident_details', 'initial_response', 'impact_level',
    'group_type', 'guideline', 'created_at', 'causing_department',
    'responsible_person'
]
history_headers = ['id', 'incident_id', 'edited_at', 'edited_by', 'changes']

def cell(value):
    if value is None:
        return ''
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    return str(value)

payload = {
    'incidents': [incident_headers] + [[cell(row.get(key)) for key in incident_headers] for row in incidents],
    'history': [history_headers] + [[cell(row.get(key)) for key in history_headers] for row in history],
}
Path('/tmp/migration-values.json').write_text(json.dumps(payload, ensure_ascii=False))
print(f"prepared {len(incidents)} incidents and {len(history)} history rows")
print('incident columns:', len(incident_headers))
print('history columns:', len(history_headers))
