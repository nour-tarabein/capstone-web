import json
import requests
from bs4 import BeautifulSoup

def scrape_luma_dc():
    url = "https://lu.ma/dc"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
    
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, "html.parser")
    
    # Luma embeds initial page state in a __NEXT_DATA__ script tag
    next_data_script = soup.find("script", id="__NEXT_DATA__")
    if not next_data_script:
        print("Could not locate __NEXT_DATA__ payload.")
        return []

    data = json.loads(next_data_script.string)
    
    # Traverse page props for event entities
    initial_props = data.get("props", {}).get("pageProps", {})
    events_raw = initial_props.get("initialData", {}).get("events", [])
    
    formatted_events = []
    for entry in events_raw:
        event = entry.get("event", {})
        
        # Mapping to your exact DB schema
        formatted_events.append({
            "id": event.get("api_id"),
            "conference_id": None,
            "source": "luma",
            "source_event_id": event.get("api_id"),
            "source_url": f"https://lu.ma/{event.get('url')}" if event.get("url") else None,
            "title": event.get("name"),
            "description": event.get("description"),
            "starts_at": event.get("start_at"),
            "ends_at": event.get("end_at"),
            "venue_name": event.get("geo_address_json", {}).get("full_address"),
            "lat": event.get("geo_latitude"),
            "lng": event.get("geo_longitude"),
            "tags": event.get("tags", []),
            "external_going_count": event.get("guest_count", 0),
            "is_official": True,
            "curation_status": "pending",
            "curation_rationale": None,
            "submitted_by": "scraper"
        })
        
    return formatted_events

if __name__ == "__main__":
    events = scrape_luma_dc()
    print(json.dumps(events, indent=2))
