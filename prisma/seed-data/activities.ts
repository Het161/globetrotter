/**
 * Six activities per city, keyed by city slug — 288 rows in total.
 *
 * Costs are USD per person and deliberately include free sights at 0, because
 * a budget planner that can't represent "free" is lying to the user. Durations
 * are realistic visit times, not opening hours.
 */

export type SeedActivityCategory =
  | "SIGHTSEEING"
  | "FOOD"
  | "CULTURE"
  | "ADVENTURE"
  | "NATURE"
  | "NIGHTLIFE"
  | "SHOPPING"
  | "RELAXATION";

export type SeedActivity = {
  name: string;
  category: SeedActivityCategory;
  description: string;
  estimatedCost: number;
  durationMin: number;
  popularity: number;
};

const a = (
  name: string,
  category: SeedActivityCategory,
  estimatedCost: number,
  durationMin: number,
  popularity: number,
  description: string,
): SeedActivity => ({ name, category, estimatedCost, durationMin, popularity, description });

export const activitiesByCity: Record<string, SeedActivity[]> = {
  /* ---------------------------------------------------------------- Europe */
  paris: [
    a("Louvre Museum", "CULTURE", 24, 210, 97, "The world's most visited museum; pick two wings rather than trying to see it all."),
    a("Eiffel Tower summit", "SIGHTSEEING", 32, 150, 96, "Lift to the second floor, then a second lift to the 276 m summit deck."),
    a("Musée d'Orsay", "CULTURE", 17, 150, 88, "Impressionist collection housed in a converted Beaux-Arts railway station."),
    a("Seine evening cruise", "SIGHTSEEING", 18, 70, 82, "An hour past the Île de la Cité and Notre-Dame as the bridges light up."),
    a("Le Marais food walk", "FOOD", 65, 180, 79, "Falafel, fromageries and a covered market across the old Jewish quarter."),
    a("Montmartre and Sacré-Cœur", "SIGHTSEEING", 0, 120, 85, "Free climb to the basilica steps for the widest view over the rooftops."),
  ],
  rome: [
    a("Colosseum and Roman Forum", "SIGHTSEEING", 20, 180, 98, "One combined ticket covers the arena, the Forum and Palatine Hill."),
    a("Vatican Museums and Sistine Chapel", "CULTURE", 27, 210, 96, "Seven kilometres of galleries ending at the Michelangelo ceiling."),
    a("Pantheon", "SIGHTSEEING", 6, 45, 90, "A 2,000-year-old concrete dome still open to the sky at its centre."),
    a("Trastevere dinner crawl", "FOOD", 55, 180, 80, "Cacio e pepe and carciofi across the cobbled streets south of the river."),
    a("Borghese Gallery", "CULTURE", 15, 120, 76, "Bernini sculptures in a garden villa; entry is by timed slot only."),
    a("Trevi Fountain at dawn", "SIGHTSEEING", 0, 40, 84, "The only hour of the day you'll get the baroque waterfall to yourself."),
  ],
  barcelona: [
    a("Sagrada Família", "SIGHTSEEING", 28, 120, 97, "Gaudí's unfinished basilica; the stained glass is worth timing for morning light."),
    a("Park Güell", "NATURE", 11, 120, 88, "Mosaic terraces and serpentine benches above the city, with a long view to the sea."),
    a("Casa Batlló", "CULTURE", 32, 90, 82, "A remodelled townhouse with a scaled roofline and no straight lines inside."),
    a("La Boqueria market", "FOOD", 25, 75, 84, "Jamón, seafood counters and fruit juice off La Rambla."),
    a("Gothic Quarter walk", "CULTURE", 0, 100, 79, "Roman wall fragments and medieval alleys, free to wander."),
    a("Barceloneta beach afternoon", "RELAXATION", 0, 180, 74, "City beach with a boardwalk of chiringuitos at the far end."),
  ],
  amsterdam: [
    a("Rijksmuseum", "CULTURE", 24, 180, 92, "Dutch Golden Age painting, with the Night Watch as the anchor."),
    a("Anne Frank House", "CULTURE", 17, 90, 94, "The secret annexe, preserved unfurnished; tickets release six weeks ahead."),
    a("Van Gogh Museum", "CULTURE", 23, 120, 90, "The largest single collection of his work, arranged chronologically."),
    a("Canal ring boat tour", "SIGHTSEEING", 20, 75, 85, "The 17th-century ring from water level, which is how it was designed to be seen."),
    a("Jordaan bike loop", "ADVENTURE", 14, 150, 78, "Rental bike through the narrowest and quietest canal streets."),
    a("Albert Cuyp street food", "FOOD", 22, 70, 72, "Stroopwafels pressed to order and herring from a stall."),
  ],
  prague: [
    a("Prague Castle complex", "SIGHTSEEING", 19, 180, 93, "The largest ancient castle in the world, including St Vitus Cathedral."),
    a("Charles Bridge at sunrise", "SIGHTSEEING", 0, 45, 88, "Thirty baroque statues and an empty deck before the crowds arrive."),
    a("Old Town Square and astronomical clock", "CULTURE", 0, 60, 86, "The 1410 clock still runs its apostle procession every hour."),
    a("Czech beer hall dinner", "FOOD", 20, 120, 80, "Goulash and unfiltered lager at a hall that has poured since the 1800s."),
    a("Vltava river cruise", "SIGHTSEEING", 16, 90, 70, "Slow loop past the castle and the national theatre."),
    a("Vyšehrad fortress walk", "NATURE", 0, 100, 66, "Clifftop ramparts and a cemetery of Czech composers, well away from tourists."),
  ],
  lisbon: [
    a("Tram 28 end to end", "SIGHTSEEING", 4, 75, 87, "A working tram route that happens to climb through every historic district."),
    a("Belém Tower and Jerónimos Monastery", "CULTURE", 18, 150, 89, "Manueline stonework from the age of Portuguese exploration."),
    a("Pastéis de Belém", "FOOD", 6, 40, 84, "Custard tarts from the 1837 bakery that holds the original recipe."),
    a("Alfama fado evening", "NIGHTLIFE", 45, 150, 80, "Live fado in a small room in the oldest quarter, dinner included."),
    a("Miradouro sunset circuit", "SIGHTSEEING", 0, 120, 76, "Three hilltop viewpoints strung together on foot."),
    a("Sintra day trip", "NATURE", 32, 360, 82, "Pena Palace and the Moorish castle in the hills, forty minutes by train."),
  ],
  istanbul: [
    a("Hagia Sophia", "CULTURE", 25, 90, 95, "A 6th-century cathedral, then a mosque, then a museum, now a mosque again."),
    a("Topkapı Palace", "CULTURE", 30, 180, 88, "Four courtyards of Ottoman court life above the Golden Horn."),
    a("Grand Bazaar", "SHOPPING", 0, 120, 84, "Four thousand shops under vaulted roofs; entry free, restraint not included."),
    a("Bosphorus ferry to Anadolu Kavağı", "SIGHTSEEING", 8, 210, 82, "The public ferry the whole way up the strait and back."),
    a("Turkish bath at a historic hamam", "RELAXATION", 55, 90, 78, "Scrub and foam wash in a 16th-century marble chamber."),
    a("Kadıköy food walk", "FOOD", 35, 180, 74, "The Asian side's market street, where the city actually eats."),
  ],
  vienna: [
    a("Schönbrunn Palace and gardens", "SIGHTSEEING", 27, 180, 90, "1,441 rooms of Habsburg summer residence, plus a free formal garden."),
    a("Kunsthistorisches Museum", "CULTURE", 21, 150, 82, "Bruegel's largest collection under a ceiling painted by Klimt."),
    a("Standing room at the Staatsoper", "CULTURE", 14, 180, 79, "Same performance as the stalls, for the price of a coffee."),
    a("Café Central coffee and cake", "FOOD", 18, 75, 80, "A Viennese coffee house that expects you to linger over one order."),
    a("Naschmarkt", "FOOD", 25, 90, 72, "A kilometre and a half of stalls, from Austrian to Levantine."),
    a("Belvedere and The Kiss", "CULTURE", 18, 120, 84, "Klimt's best-known painting in a baroque garden palace."),
  ],

  /* ------------------------------------------------------------------ Asia */
  tokyo: [
    a("Senso-ji Temple, Asakusa", "CULTURE", 0, 90, 92, "Tokyo's oldest temple, approached down a market street of snack stalls."),
    a("teamLab Borderless", "CULTURE", 25, 180, 89, "Room-scale digital art you walk through rather than look at."),
    a("Tsukiji outer market breakfast", "FOOD", 30, 120, 88, "Tamagoyaki, uni and knife shops; the inner auction moved but the stalls stayed."),
    a("Shibuya Sky observation deck", "SIGHTSEEING", 18, 90, 86, "Open-air rooftop at 229 m directly above the crossing."),
    a("Shinjuku izakaya night", "NIGHTLIFE", 45, 180, 84, "Yakitori and highballs down the alleys of Omoide Yokochō."),
    a("Meiji Jingū forest walk", "NATURE", 0, 90, 80, "A hundred thousand donated trees around a shrine, in the middle of the city."),
  ],
  kyoto: [
    a("Fushimi Inari torii climb", "SIGHTSEEING", 0, 150, 96, "Ten thousand vermilion gates up the mountainside; go before eight."),
    a("Kinkaku-ji, the Golden Pavilion", "SIGHTSEEING", 4, 60, 93, "Gold-leaf pavilion reflected in its own pond, best on a still morning."),
    a("Arashiyama bamboo grove", "NATURE", 0, 90, 90, "A groomed bamboo corridor plus a monkey park on the hill above."),
    a("Tea ceremony in Gion", "CULTURE", 55, 90, 82, "A full temae in a machiya tea room, explained step by step."),
    a("Nishiki Market", "FOOD", 28, 90, 84, "Five covered blocks of pickles, tofu and grilled skewers."),
    a("Kiyomizu-dera and Higashiyama", "CULTURE", 4, 150, 88, "A hillside temple on wooden stilts, then the preserved lanes below it."),
  ],
  osaka: [
    a("Dōtonbori street food", "FOOD", 30, 150, 92, "Takoyaki and okonomiyaki under the neon on the canal."),
    a("Osaka Castle and park", "SIGHTSEEING", 4, 120, 85, "Reconstructed keep with a museum inside and cherry trees around it."),
    a("Kuromon Ichiba Market", "FOOD", 26, 90, 80, "Grilled scallops and wagyu skewers eaten standing at the stall."),
    a("Umeda Sky Building float garden", "SIGHTSEEING", 12, 75, 78, "A rooftop observatory bridging two towers at 173 m."),
    a("Shinsekai and Tsūtenkaku", "CULTURE", 7, 90, 72, "A retro district built to look like 1912's idea of the future."),
    a("Universal Studios Japan", "ADVENTURE", 62, 480, 82, "A full day; the Nintendo area needs a timed entry ticket."),
  ],
  seoul: [
    a("Gyeongbokgung Palace", "CULTURE", 3, 120, 90, "The main Joseon palace, with a guard-changing ceremony twice a day."),
    a("Bukchon Hanok Village", "SIGHTSEEING", 0, 90, 84, "Six hundred traditional houses on a hill between two palaces."),
    a("Gwangjang Market", "FOOD", 18, 90, 86, "Bindaetteok and mayak gimbap at stools between the stalls."),
    a("Namsan Tower cable car", "SIGHTSEEING", 16, 120, 80, "Cable car up the central mountain for the full basin view."),
    a("Hongdae night out", "NIGHTLIFE", 40, 210, 78, "Student district with buskers on the street until well past midnight."),
    a("Bukhansan day hike", "ADVENTURE", 3, 300, 72, "Granite peaks inside the city limits, reachable by subway."),
  ],
  bangkok: [
    a("Grand Palace and Wat Phra Kaew", "CULTURE", 15, 150, 94, "The Emerald Buddha and a compound of gilded, mirrored spires."),
    a("Wat Arun at sunset", "SIGHTSEEING", 3, 75, 88, "Porcelain-encrusted prang across the river, best from the far bank."),
    a("Chatuchak Weekend Market", "SHOPPING", 0, 210, 84, "Fifteen thousand stalls; weekends only, and you will get lost."),
    a("Chao Phraya river boat", "SIGHTSEEING", 2, 60, 80, "The orange-flag commuter boat, which is also the fastest way around."),
    a("Street food tour, Chinatown", "FOOD", 25, 180, 90, "Yaowarat Road after dark, where the woks come out onto the pavement."),
    a("Thai cooking class", "FOOD", 38, 240, 76, "Market shop plus four dishes, recipes to take home."),
  ],
  singapore: [
    a("Gardens by the Bay", "NATURE", 20, 180, 92, "Supertree grove plus two cooled conservatories; the light show is free."),
    a("Hawker dinner at Maxwell", "FOOD", 8, 60, 88, "Hainanese chicken rice and char kway teow for a few dollars."),
    a("Marina Bay Sands SkyPark", "SIGHTSEEING", 24, 75, 85, "Observation deck on the boat-shaped roof, 200 m up."),
    a("Singapore Zoo and River Wonders", "NATURE", 38, 240, 80, "Open-enclosure design with moats instead of bars."),
    a("Chinatown and Sri Mariamman", "CULTURE", 0, 90, 74, "Shophouses, a Taoist temple and the oldest Hindu temple in the country."),
    a("Sentosa beach afternoon", "RELAXATION", 5, 210, 72, "Man-made beaches, a cable car and a boardwalk back to the mainland."),
  ],
  ubud: [
    a("Tegalalang rice terraces", "NATURE", 2, 120, 90, "Stepped paddies cut into the valley side; walk down rather than photograph from the road."),
    a("Sacred Monkey Forest Sanctuary", "NATURE", 6, 90, 84, "Three temples in a nutmeg forest with about 1,200 macaques."),
    a("Balinese cooking class", "FOOD", 35, 240, 80, "Base gede from scratch, then five dishes built on it."),
    a("Tirta Empul water temple", "CULTURE", 4, 120, 82, "A spring-fed purification pool people have bathed in since 962."),
    a("Campuhan Ridge sunrise walk", "ADVENTURE", 0, 90, 76, "An easy ridge path between two rivers, best before the heat."),
    a("Spa afternoon", "RELAXATION", 28, 120, 78, "Two-hour Balinese massage and flower bath at village prices."),
  ],
  dubai: [
    a("Burj Khalifa levels 124 and 125", "SIGHTSEEING", 45, 90, 93, "The tallest building on earth; sunset slots cost roughly double."),
    a("Desert safari with dinner", "ADVENTURE", 70, 360, 90, "Dune drive, camel ride and a camp dinner in the Al Marmoom reserve."),
    a("Dubai Mall and Fountain show", "SHOPPING", 0, 180, 84, "Twelve hundred shops, an aquarium wall, and a free fountain show every half hour."),
    a("Old Dubai souks and abra crossing", "CULTURE", 1, 120, 80, "Gold and spice souks either side of the creek, linked by a wooden water taxi."),
    a("Museum of the Future", "CULTURE", 41, 120, 82, "A calligraphy-clad torus with exhibits set in 2071."),
    a("Jumeirah beach day", "RELAXATION", 0, 240, 74, "Public beach with the Burj Al Arab in the frame."),
  ],

  /* ------------------------------------------------------------ South Asia */
  goa: [
    a("Palolem beach day", "RELAXATION", 0, 300, 88, "A crescent bay in the south with calm water and beach huts."),
    a("Old Goa churches", "CULTURE", 0, 120, 78, "Basilica of Bom Jesus and Sé Cathedral, both UNESCO-listed."),
    a("Dudhsagar Falls jeep trip", "ADVENTURE", 22, 360, 82, "A 310 m four-tier waterfall inside Bhagwan Mahavir sanctuary."),
    a("Anjuna flea market", "SHOPPING", 0, 150, 74, "Wednesday market on the cliffs, running since the 1970s."),
    a("Mandovi sunset cruise", "SIGHTSEEING", 6, 60, 70, "An hour on the river with live Goan folk music."),
    a("Spice plantation lunch", "FOOD", 12, 180, 72, "Walk through pepper and vanilla vines, then a banana-leaf thali."),
  ],
  jaipur: [
    a("Amber Fort", "SIGHTSEEING", 7, 180, 92, "Hilltop fort with a mirrored hall, above a lake it was built to overlook."),
    a("Hawa Mahal", "SIGHTSEEING", 3, 60, 88, "The 953-window screen built so royal women could watch the street unseen."),
    a("City Palace and Jantar Mantar", "CULTURE", 10, 150, 84, "A working royal residence next to eighteenth-century stone astronomical instruments."),
    a("Bazaar walk in the Pink City", "SHOPPING", 0, 120, 78, "Johari and Bapu bazaars for block prints, lac bangles and juttis."),
    a("Rajasthani thali dinner", "FOOD", 9, 90, 76, "Dal baati churma and gatte ki sabzi, served until you stop them."),
    a("Nahargarh Fort at sunset", "SIGHTSEEING", 2, 120, 80, "The ridge fort with the whole city laid out below it."),
  ],
  udaipur: [
    a("City Palace Udaipur", "CULTURE", 8, 150, 90, "The largest palace complex in Rajasthan, built up over four hundred years."),
    a("Lake Pichola boat ride", "SIGHTSEEING", 12, 60, 88, "Around Jag Mandir at golden hour, with the ghats lit behind you."),
    a("Jagdish Temple", "CULTURE", 0, 45, 76, "An Indo-Aryan temple from 1651, still in daily use above the bazaar."),
    a("Sajjangarh Monsoon Palace", "SIGHTSEEING", 4, 120, 78, "A hilltop palace built to watch the monsoon clouds come in."),
    a("Miniature painting workshop", "CULTURE", 18, 150, 70, "Squirrel-hair brushwork in the Mewar school, taught by a working artist."),
    a("Rooftop dinner over the lake", "FOOD", 14, 120, 80, "Most of the old city's restaurants are on their roofs for the view."),
  ],
  kochi: [
    a("Chinese fishing nets, Fort Kochi", "SIGHTSEEING", 0, 60, 82, "Cantilevered shore nets worked by hand since the 14th century."),
    a("Kathakali performance", "CULTURE", 6, 120, 84, "Arrive an hour early to watch the makeup go on — that's half the art."),
    a("Backwater houseboat, Alleppey", "NATURE", 85, 480, 90, "A converted rice barge through the canal network south of the city."),
    a("Mattancherry Palace and Jew Town", "CULTURE", 1, 120, 74, "Mural-covered Portuguese palace beside a 1568 synagogue."),
    a("Keralan seafood dinner", "FOOD", 11, 90, 78, "Karimeen pollichathu grilled in a banana leaf."),
    a("Spice market walk", "SHOPPING", 0, 90, 68, "Cardamom and pepper warehouses that have traded here for six centuries."),
  ],
  varanasi: [
    a("Sunrise boat on the Ganges", "SIGHTSEEING", 8, 90, 95, "The eighty ghats from the water as the city starts its day."),
    a("Ganga Aarti at Dashashwamedh", "CULTURE", 0, 75, 92, "A synchronised fire ceremony performed at the river every evening."),
    a("Sarnath", "CULTURE", 4, 150, 80, "Where the Buddha gave his first sermon, ten kilometres out of town."),
    a("Old city gully walk", "CULTURE", 0, 120, 78, "Lanes too narrow for cars, opening onto temples without warning."),
    a("Banarasi silk weaving workshop", "SHOPPING", 0, 90, 70, "Handloom brocade being woven, with no obligation to buy."),
    a("Kachori and lassi breakfast", "FOOD", 3, 60, 74, "The local breakfast, eaten standing at a stall near the ghats."),
  ],
  leh: [
    a("Pangong Tso day trip", "NATURE", 45, 600, 92, "A 134 km lake at 4,350 m that changes colour through the day."),
    a("Thiksey Monastery morning prayers", "CULTURE", 2, 120, 86, "A twelve-storey gompa where you can sit in on the 6 a.m. puja."),
    a("Nubra Valley over Khardung La", "ADVENTURE", 90, 720, 88, "One of the highest motorable passes, down to sand dunes and two-humped camels."),
    a("Leh Palace and old town", "SIGHTSEEING", 2, 90, 74, "A nine-storey 17th-century palace modelled on the Potala."),
    a("Magnetic Hill and Sangam", "SIGHTSEEING", 12, 180, 70, "An optical-illusion slope, then the Indus and Zanskar meeting point."),
    a("Ladakhi cooking and butter tea", "FOOD", 15, 120, 66, "Momos and thukpa in a home kitchen, plus the tea you should try once."),
  ],
  rishikesh: [
    a("White water rafting on the Ganges", "ADVENTURE", 14, 180, 92, "Grade III rapids on the sixteen-kilometre Shivpuri run."),
    a("Sunrise yoga class", "RELAXATION", 6, 90, 88, "Hatha or ashtanga at a riverside ashram, drop-ins welcome."),
    a("Lakshman Jhula and Ram Jhula", "SIGHTSEEING", 0, 90, 80, "Two suspension footbridges linking the ashram banks."),
    a("Beatles Ashram", "CULTURE", 7, 120, 78, "The abandoned Maharishi compound, now covered in murals."),
    a("Triveni Ghat evening aarti", "CULTURE", 0, 60, 76, "Smaller and calmer than Varanasi's, and closer to the water."),
    a("Kunjapuri sunrise trek", "ADVENTURE", 9, 240, 72, "A short pre-dawn climb to a Himalayan skyline of Nanda Devi and Swargarohini."),
  ],
  mumbai: [
    a("Gateway of India and Colaba", "SIGHTSEEING", 0, 90, 86, "The 1924 arch on the waterfront, with the Taj Mahal Palace behind it."),
    a("Elephanta Caves", "CULTURE", 8, 300, 82, "Rock-cut Shiva temples on an island, an hour out by ferry."),
    a("Dharavi community walk", "CULTURE", 12, 180, 74, "A guided walk through the recycling and leather workshops, run by a local NGO."),
    a("Marine Drive to Chowpatty at dusk", "SIGHTSEEING", 0, 90, 84, "The Art Deco seafront curve that lights up as the Queen's Necklace."),
    a("Bombay street food crawl", "FOOD", 10, 150, 88, "Vada pav, pav bhaji and bhel puri, in that order."),
    a("Chhatrapati Shivaji Terminus", "SIGHTSEEING", 0, 60, 78, "A working Victorian Gothic railway station and a UNESCO site."),
  ],

  /* -------------------------------------------------------------- Americas */
  "new-york": [
    a("Metropolitan Museum of Art", "CULTURE", 30, 210, 92, "Two million works; the Egyptian wing and the roof garden are the shortcuts."),
    a("Statue of Liberty and Ellis Island", "SIGHTSEEING", 25, 300, 90, "Ferry ticket includes both islands and the immigration museum."),
    a("Top of the Rock", "SIGHTSEEING", 40, 90, 86, "The observation deck with the Empire State Building actually in the view."),
    a("High Line and Chelsea Market", "SIGHTSEEING", 0, 150, 84, "An elevated freight line turned linear park, ending at a food hall."),
    a("Broadway show", "CULTURE", 120, 180, 88, "Same-day TKTS booth in Times Square cuts about half off."),
    a("Central Park walk", "NATURE", 0, 150, 85, "843 acres; the Ramble and Bethesda Terrace in one loop."),
  ],
  "san-francisco": [
    a("Alcatraz Island", "CULTURE", 47, 240, 92, "Cellhouse audio tour narrated by former inmates and guards; book weeks ahead."),
    a("Golden Gate Bridge walk", "SIGHTSEEING", 0, 120, 90, "2.7 km across the east sidewalk, with fog arriving most afternoons."),
    a("Cable car to Fisherman's Wharf", "SIGHTSEEING", 8, 60, 82, "The last manually operated cable car system in the world."),
    a("Ferry Building marketplace", "FOOD", 30, 90, 78, "Oyster bar, bread and a farmers' market three days a week."),
    a("Muir Woods redwoods", "NATURE", 15, 240, 84, "Old-growth coast redwoods half an hour north; parking is by reservation."),
    a("Mission District mural walk", "CULTURE", 0, 120, 74, "Balmy and Clarion alleys, plus the best burritos in the city."),
  ],
  "mexico-city": [
    a("Teotihuacán pyramids", "SIGHTSEEING", 18, 360, 93, "The Sun and Moon pyramids on a two-kilometre ceremonial avenue, an hour out."),
    a("National Museum of Anthropology", "CULTURE", 5, 210, 90, "The Aztec Sun Stone and the best pre-Hispanic collection anywhere."),
    a("Frida Kahlo Museum, Coyoacán", "CULTURE", 14, 120, 88, "La Casa Azul, where she was born and died; timed tickets only."),
    a("Xochimilco trajinera", "NATURE", 25, 240, 82, "Painted flat-boats on the last surviving Aztec canals."),
    a("Centro Histórico street food", "FOOD", 15, 150, 86, "Tacos al pastor, tlacoyos and churros around the Zócalo."),
    a("Lucha libre night", "NIGHTLIFE", 20, 180, 78, "Masked wrestling at Arena México, Tuesday and Friday nights."),
  ],
  cancun: [
    a("Chichén Itzá", "SIGHTSEEING", 35, 480, 92, "El Castillo and the ball court, two and a half hours inland."),
    a("Cenote swim at Ik Kil", "NATURE", 12, 120, 86, "A 26 m open sinkhole with vines down to the water."),
    a("Isla Mujeres ferry day", "RELAXATION", 22, 360, 84, "Playa Norte is shallow and calm the whole way out."),
    a("Reef snorkel at Puerto Morelos", "ADVENTURE", 45, 180, 80, "The second-largest barrier reef in the world, protected as a park."),
    a("Tulum ruins", "SIGHTSEEING", 15, 240, 82, "The only major Maya site built on the coast, on a cliff above the beach."),
    a("Hotel Zone beach day", "RELAXATION", 0, 240, 72, "Public access points along Boulevard Kukulcán."),
  ],
  "rio-de-janeiro": [
    a("Christ the Redeemer", "SIGHTSEEING", 28, 180, 96, "Cog train up Corcovado; go early before the cloud sits on the summit."),
    a("Sugarloaf cable car", "SIGHTSEEING", 24, 150, 90, "Two stages to 396 m, with the harbour mouth directly below."),
    a("Copacabana and Ipanema", "RELAXATION", 0, 240, 88, "Two beaches separated by a headland and a very different crowd."),
    a("Escadaria Selarón", "CULTURE", 0, 45, 80, "Two hundred and fifteen steps tiled with donations from sixty countries."),
    a("Tijuca Forest hike", "NATURE", 5, 240, 76, "The largest urban rainforest in the world, replanted by hand in the 1860s."),
    a("Samba night in Lapa", "NIGHTLIFE", 25, 210, 82, "Live roda de samba under the aqueduct arches."),
  ],
  "buenos-aires": [
    a("Recoleta Cemetery", "CULTURE", 6, 90, 86, "A city block of mausoleums, including Eva Perón's."),
    a("Tango show in San Telmo", "CULTURE", 55, 180, 84, "Dinner and a live orquesta típica in the old quarter."),
    a("Caminito, La Boca", "SIGHTSEEING", 0, 90, 78, "The painted corrugated-iron street built by dock workers."),
    a("Teatro Colón tour", "CULTURE", 15, 75, 80, "One of the three best acoustics of any opera house in the world."),
    a("Parrilla dinner", "FOOD", 28, 150, 88, "Bife de chorizo over wood coals, with a malbec."),
    a("Palermo bookshops and parks", "SHOPPING", 0, 150, 72, "El Ateneo Grand Splendid, a theatre converted into a bookshop."),
  ],
  cusco: [
    a("Machu Picchu", "SIGHTSEEING", 165, 720, 98, "Train to Aguas Calientes, bus up; entry is by timed circuit."),
    a("Sacred Valley: Pisac and Ollantaytambo", "SIGHTSEEING", 40, 480, 88, "Terraced Inca sites and a market town between them."),
    a("Rainbow Mountain trek", "ADVENTURE", 45, 600, 84, "Vinicunca at 5,200 m; only attempt after several days acclimatising."),
    a("San Pedro Market", "FOOD", 8, 90, 78, "Fruit juice counters, cheeses and a cheap almuerzo upstairs."),
    a("Qorikancha and Santo Domingo", "CULTURE", 5, 90, 80, "A Spanish convent built directly on the Inca sun temple's walls."),
    a("Sacsayhuamán", "SIGHTSEEING", 12, 150, 82, "Megalithic zigzag walls above the city, stones fitted without mortar."),
  ],
  vancouver: [
    a("Stanley Park seawall cycle", "NATURE", 12, 180, 90, "Ten kilometres around a forested peninsula, ocean on one side the whole way."),
    a("Capilano Suspension Bridge", "ADVENTURE", 50, 180, 84, "A 137 m span 70 m above the river, plus a treetop walkway."),
    a("Granville Island Public Market", "FOOD", 25, 120, 86, "A converted industrial island of food stalls and workshops."),
    a("Grouse Mountain skyride", "NATURE", 55, 240, 80, "Gondola to 1,100 m, with grizzlies in a refuge at the top."),
    a("Gastown and the steam clock", "SIGHTSEEING", 0, 90, 72, "The oldest part of the city, cobbled and rebuilt after the 1886 fire."),
    a("Whale watching from the harbour", "NATURE", 110, 240, 78, "Orca and humpback in the Salish Sea, April to October."),
  ],

  /* -------------------------------------------------- Africa & Middle East */
  "cape-town": [
    a("Table Mountain cableway", "NATURE", 24, 180, 95, "Rotating cable car to a 1,085 m plateau; closes in high wind."),
    a("Cape Point and Chapman's Peak", "NATURE", 45, 420, 90, "The peninsula drive to the cape, with baboons and a lighthouse."),
    a("Robben Island", "CULTURE", 33, 240, 88, "Ferry to the prison island, with tours led by former political prisoners."),
    a("Boulders Beach penguins", "NATURE", 10, 120, 86, "An African penguin colony on a public beach at Simon's Town."),
    a("Constantia wine tasting", "FOOD", 30, 210, 80, "The oldest wine estates in the southern hemisphere, twenty minutes from town."),
    a("Bo-Kaap walk", "CULTURE", 0, 90, 74, "Painted Cape Malay houses on the slope below Signal Hill."),
  ],
  marrakech: [
    a("Jemaa el-Fnaa at night", "CULTURE", 0, 120, 92, "The main square turns into an open-air food court after sunset."),
    a("Bahia Palace", "CULTURE", 8, 90, 84, "Painted cedar ceilings and courtyards from the 1860s."),
    a("Souks of the medina", "SHOPPING", 0, 150, 86, "Leather, lanterns and rugs; haggling is expected, not optional."),
    a("Jardin Majorelle and YSL Museum", "NATURE", 25, 120, 88, "Cobalt-blue garden buildings and a cactus collection."),
    a("Atlas Mountains day trip", "ADVENTURE", 55, 480, 82, "Berber villages and the Ourika valley, an hour and a half out."),
    a("Hammam and argan massage", "RELAXATION", 40, 120, 78, "Black soap scrub then rhassoul clay, the local weekly ritual."),
  ],
  cairo: [
    a("Pyramids of Giza and the Sphinx", "SIGHTSEEING", 15, 240, 98, "The last surviving ancient wonder, on the edge of the suburbs."),
    a("Grand Egyptian Museum", "CULTURE", 25, 240, 94, "The full Tutankhamun collection, shown together for the first time."),
    a("Khan el-Khalili bazaar", "SHOPPING", 0, 120, 82, "A souk trading on the same site since 1382, with a famous coffee house."),
    a("Felucca on the Nile", "RELAXATION", 12, 90, 80, "A lateen-sail boat at sunset, hired by the hour."),
    a("Islamic Cairo walk", "CULTURE", 5, 180, 76, "Mosques and madrasas from Ibn Tulun to the Citadel."),
    a("Saqqara and the Step Pyramid", "SIGHTSEEING", 14, 180, 78, "The oldest stone building of its size anywhere, thirty km south."),
  ],
  zanzibar: [
    a("Stone Town walking tour", "CULTURE", 15, 150, 86, "Carved doors, the old fort and the former slave market site."),
    a("Nungwi and Kendwa beaches", "RELAXATION", 0, 300, 88, "North-coast sand where the tide doesn't strand you at low water."),
    a("Spice farm tour", "FOOD", 18, 180, 80, "Clove, nutmeg and cinnamon in the plantations that named the coast."),
    a("Prison Island tortoises", "NATURE", 25, 180, 76, "Giant Aldabra tortoises, some over a century old, plus a reef to snorkel."),
    a("Jozani Forest red colobus", "NATURE", 12, 150, 74, "The only place the Zanzibar red colobus survives."),
    a("Forodhani night market", "FOOD", 10, 90, 78, "Seafood skewers and Zanzibar pizza on the seafront."),
  ],
  nairobi: [
    a("Nairobi National Park", "NATURE", 43, 240, 90, "Rhino, lion and giraffe with the city skyline behind them."),
    a("David Sheldrick elephant orphanage", "NATURE", 15, 90, 88, "One public hour a day, when the orphaned calves are fed."),
    a("Giraffe Centre", "NATURE", 15, 90, 82, "Feed endangered Rothschild's giraffes from a raised platform."),
    a("Karen Blixen Museum", "CULTURE", 12, 90, 74, "The farmhouse from Out of Africa, at the foot of the Ngong Hills."),
    a("Maasai Market", "SHOPPING", 0, 120, 70, "A rotating open-air craft market, different suburb each day."),
    a("Nyama choma dinner", "FOOD", 18, 120, 76, "Slow-grilled goat and beef, the national weekend meal."),
  ],
  petra: [
    a("Petra by day: Siq to the Treasury", "SIGHTSEEING", 70, 360, 97, "A 1.2 km slot canyon opening onto the Khazneh facade."),
    a("Monastery (Ad Deir) climb", "ADVENTURE", 0, 240, 88, "Eight hundred rock-cut steps to the largest carved facade on site."),
    a("Petra by Night", "CULTURE", 24, 120, 82, "The Siq lit by 1,500 candles, three evenings a week."),
    a("Wadi Rum jeep and camp", "ADVENTURE", 95, 720, 90, "Sandstone desert an hour south, with a night in a Bedouin camp."),
    a("Little Petra (Siq al-Barid)", "SIGHTSEEING", 0, 120, 72, "A smaller Nabataean suburb with painted ceilings and no crowds."),
    a("Bedouin mansaf dinner", "FOOD", 22, 120, 70, "Lamb cooked in fermented yoghurt over rice, Jordan's national dish."),
  ],
  doha: [
    a("Museum of Islamic Art", "CULTURE", 14, 150, 88, "I. M. Pei's last major building, on its own island in the bay."),
    a("Souq Waqif", "SHOPPING", 0, 120, 84, "A rebuilt market with falcon dealers and Levantine restaurants."),
    a("National Museum of Qatar", "CULTURE", 14, 150, 82, "Jean Nouvel's interlocking desert-rose discs."),
    a("Inland Sea desert safari", "ADVENTURE", 75, 420, 86, "Dune bashing to Khor Al Adaid, where the sea reaches into the desert."),
    a("Corniche walk and dhow ride", "SIGHTSEEING", 8, 120, 74, "Seven kilometres of waterfront facing the West Bay towers."),
    a("Katara Cultural Village", "CULTURE", 0, 120, 70, "An amphitheatre, galleries and a pigeon tower on the beach."),
  ],
  muscat: [
    a("Sultan Qaboos Grand Mosque", "CULTURE", 0, 120, 90, "A single 21-tonne Persian carpet and a Swarovski chandelier; mornings only."),
    a("Mutrah Souq and Corniche", "SHOPPING", 0, 120, 84, "Frankincense and silver in one of the oldest markets in the Arab world."),
    a("Wadi Shab", "ADVENTURE", 25, 360, 88, "A hike, three swims and a waterfall inside a cave at the end."),
    a("Nizwa Fort and Friday market", "CULTURE", 12, 300, 78, "A 17th-century round tower and a livestock auction at dawn."),
    a("Dolphin watching cruise", "NATURE", 45, 150, 76, "Spinner dolphins off the coast most mornings of the year."),
    a("Royal Opera House Muscat", "CULTURE", 30, 180, 70, "Omani stonework and a retractable acoustic ceiling."),
  ],

  /* --------------------------------------------------------------- Oceania */
  sydney: [
    a("Sydney Opera House tour", "CULTURE", 30, 90, 94, "Inside the shells, including the concert hall's 2022 acoustic rebuild."),
    a("Harbour Bridge Climb", "ADVENTURE", 175, 210, 88, "Up the outer arch to 134 m; the summit tour takes three and a half hours."),
    a("Bondi to Coogee coastal walk", "NATURE", 0, 150, 90, "Six kilometres of clifftop path past four beaches and a sea pool."),
    a("Taronga Zoo by ferry", "NATURE", 42, 240, 82, "A hillside zoo where the giraffe enclosure faces the Opera House."),
    a("Manly ferry and beach", "RELAXATION", 8, 240, 84, "Thirty minutes across the harbour on a public ferry."),
    a("The Rocks weekend market", "SHOPPING", 0, 120, 74, "Sandstone laneways from the 1790s under the bridge approach."),
  ],
  melbourne: [
    a("Laneway coffee and street art walk", "CULTURE", 15, 150, 88, "Hosier and AC/DC lanes, plus the cafés that made the city's name."),
    a("Great Ocean Road day trip", "NATURE", 85, 660, 92, "The Twelve Apostles and Loch Ard Gorge, 240 km each way."),
    a("Queen Victoria Market", "FOOD", 20, 120, 82, "Seven hectares of produce and deli halls, trading since 1878."),
    a("MCG and sports precinct tour", "CULTURE", 28, 90, 76, "A 100,000-seat stadium and the national sports museum."),
    a("Royal Botanic Gardens", "NATURE", 0, 120, 74, "Thirty-eight hectares on the Yarra, with an Aboriginal heritage walk."),
    a("Phillip Island penguin parade", "NATURE", 20, 300, 84, "Little penguins coming ashore at dusk, every night of the year."),
  ],
  queenstown: [
    a("Kawarau Bridge bungy", "ADVENTURE", 130, 120, 92, "The world's first commercial bungy site, 43 m over the river."),
    a("Milford Sound day trip", "NATURE", 130, 720, 94, "A fiord with 1,200 m walls, cruise included; it rains 200 days a year."),
    a("Skyline gondola and luge", "ADVENTURE", 45, 150, 86, "The steepest cable car lift in the southern hemisphere, plus a luge track."),
    a("Shotover Jet", "ADVENTURE", 100, 60, 84, "Jet boat through a canyon at 85 km/h, with 360° spins."),
    a("Ben Lomond track", "NATURE", 0, 360, 76, "A demanding day hike to 1,748 m above the lake."),
    a("Central Otago wine tasting", "FOOD", 60, 240, 80, "The world's southernmost pinot noir region, half an hour out."),
  ],
  auckland: [
    a("Sky Tower", "SIGHTSEEING", 26, 90, 84, "The tallest structure in the southern hemisphere, with a glass floor."),
    a("Waiheke Island wineries", "FOOD", 75, 480, 88, "Forty minutes by ferry to a island of vineyards and bays."),
    a("Rangitoto Island summit", "NATURE", 25, 300, 80, "A volcano that emerged from the sea 600 years ago; lava-field walk to the crater."),
    a("Auckland War Memorial Museum", "CULTURE", 17, 150, 78, "The best Māori and Pacific collection anywhere, plus a daily performance."),
    a("Piha Beach and Kitekite Falls", "NATURE", 0, 300, 82, "Black volcanic sand on the west coast, with rainforest behind."),
    a("Viaduct Harbour dinner", "FOOD", 45, 120, 70, "The America's Cup basin, now a restaurant strip."),
  ],
  "gold-coast": [
    a("Surfers Paradise beach and lesson", "ADVENTURE", 55, 180, 86, "Two-hour group lesson on a consistent beach break."),
    a("Springbrook National Park", "NATURE", 0, 300, 82, "Natural Bridge waterfall cave, with glow worms after dark."),
    a("Currumbin Wildlife Sanctuary", "NATURE", 40, 240, 80, "Rainbow lorikeet feeding twice daily since the 1940s."),
    a("Warner Bros Movie World", "ADVENTURE", 70, 480, 78, "The Gold Coast's biggest theme park; multi-park passes cut the cost."),
    a("Burleigh Heads headland walk", "NATURE", 0, 120, 76, "A short coastal track through pandanus with a long point break below."),
    a("Tamborine Mountain and skywalk", "NATURE", 15, 300, 72, "A rainforest canopy walkway forty minutes inland."),
  ],
  perth: [
    a("Rottnest Island and quokkas", "NATURE", 85, 480, 90, "Ferry plus bike hire; no private cars on the island."),
    a("Kings Park and Botanic Garden", "NATURE", 0, 150, 84, "Four hundred hectares above the Swan River, bigger than Central Park."),
    a("Fremantle markets and prison", "CULTURE", 18, 240, 80, "A convict-built prison and a Victorian market hall in the port town."),
    a("Swan Valley wine and food trail", "FOOD", 65, 360, 76, "Western Australia's oldest wine region, twenty-five minutes out."),
    a("Cottesloe Beach sunset", "RELAXATION", 0, 120, 78, "West-facing Indian Ocean beach with Norfolk pines along the terrace."),
    a("Pinnacles Desert day trip", "NATURE", 95, 600, 74, "Thousands of limestone spires in Nambung National Park."),
  ],
  hobart: [
    a("MONA", "CULTURE", 28, 240, 92, "A subterranean museum reached by catamaran, deliberately hard to categorise."),
    a("Salamanca Market", "SHOPPING", 0, 150, 84, "Three hundred stalls along the Georgian warehouse row, Saturdays only."),
    a("Mount Wellington summit", "NATURE", 0, 180, 86, "A 1,271 m drive-up peak with the whole estuary below; snow is possible any month."),
    a("Port Arthur Historic Site", "CULTURE", 32, 360, 82, "A convict settlement on a peninsula, ninety minutes south."),
    a("Bruny Island food tour", "FOOD", 105, 480, 78, "Oysters, cheese and whisky, plus a neck lookout on the isthmus."),
    a("Bonorong Wildlife Sanctuary", "NATURE", 20, 150, 74, "Tasmanian devils and wombats at a rescue and rehabilitation centre."),
  ],
  nadi: [
    a("Mamanuca islands day cruise", "RELAXATION", 90, 480, 90, "Catamaran to a sand cay, with snorkelling off the beach."),
    a("Sabeto mud pools and hot springs", "RELAXATION", 20, 150, 80, "Volcanic mud bath then three progressively hotter spring pools."),
    a("Sri Siva Subramaniya Temple", "CULTURE", 3, 60, 76, "The largest Hindu temple in the southern hemisphere, painted by Indian artisans."),
    a("Garden of the Sleeping Giant", "NATURE", 9, 120, 74, "Orchid collection started by Raymond Burr, on the Nausori Highlands slope."),
    a("Kava ceremony in a village", "CULTURE", 25, 120, 78, "A sevusevu welcome, presented and drunk in the proper order."),
    a("Cloud 9 floating platform", "NIGHTLIFE", 75, 300, 72, "A two-storey bar moored over a reef, reached by boat."),
  ],
};

/** Sanity check used by the seed script so a typo can't silently drop a city. */
export function activityCount(): number {
  return Object.values(activitiesByCity).reduce((sum, list) => sum + list.length, 0);
}
