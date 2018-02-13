import { h, Component } from 'preact'
import { Howl } from 'howler'
import './style.css'

const KEY_SURAH = 'surah'
const KEY_AYAH_FROM = 'ayahFrom'
const KEY_AYAH_TO = 'ayahTo'
const KEY_AYAH_COUNT = 'ayahCount'

const surah = require('./surah.json')

const renderSurahOption = () => {
	let options = []
	
	surah.forEach((val, idx) => {
		const { title, count } = val
		let value = JSON.stringify({index: idx + 1, count})
		
		options.push(<option value={value} >{ title }</option>)
	})

	return options
} 

const renderAyahOption = (count) => 
	renderAyahOptionWithRange(1, count)

const renderAyahOptionWithRange = (from, to) => 
	Array.apply(null, Array(to - from + 1)).map((_, idx) => 
		<option value={idx + from}>{ idx + from }</option>)	

export default class App extends Component {
        constructor (props) {
                super(props)

		this.players = []
		this.startFetch()
        }

        state = {
		ready: 0,
		playing: false,
		currentPlayer: null,

		surah: parseInt(localStorage.getItem(KEY_SURAH)) || 1,
		ayahFrom: parseInt(localStorage.getItem(KEY_AYAH_FROM)) || 1,
		ayahTo: parseInt(localStorage.getItem(KEY_AYAH_TO)) || 1,
		ayahCount: parseInt(localStorage.getItem(KEY_AYAH_COUNT)) || 7
        }

        startFetch = () => {
                const { surah, ayahFrom, ayahTo } = this.state

		this.players.map(player => player.stop())
		this.players = []
		this.setState({ ready: 0, playing: false })

                this.getAyah(surah, ayahFrom, ayahTo)
        }

        getAyah = async (surah, ayahFrom, ayahTo) => {
		let data = []
		for (let idx = ayahFrom; idx <= ayahTo; idx++) {
			let key = `${surah}:${idx}`
			let ayah = localStorage.getItem(key)
			
			if (!ayah) {
				try {
					ayah = await this.fetchAyah(key)
					
					localStorage.setItem(key, ayah)
					data.push(ayah)
				} catch (err) {
					alert('Something wrong')
				}
			} else {
				data.push(ayah)
			}	
		}

		this.parseAudio(data)
	}
	
	fetchAyah = async (key) => {
			let res = await this.fetchApi(key)
			let parsed = await res.json()
			let audioRes = await this.fetchAudio(key, parsed.data.audio)
			let buffer = await audioRes.arrayBuffer()

			return btoa(String.fromCharCode(...new Uint8Array(buffer)))
	}

        fetchApi = (key) => fetch(`https://api.alquran.cloud/ayah/${key}/ar.abdulbasitmurattal`)

        fetchAudio = (key, url) => {
		url = url.replace(/https?/, 'https')
                return fetch(url)
        }

        parseAudio = (data) => {
		this.players = data.map((encoded) => new Howl({
			src: [`data:audio/mp3;base64,${encoded}`],
			onload: () => this.setState({ ready: this.state.ready + 1 }),
			onend: () => this.nextAyah()
		}))

		this.setState({ currentPlayer: 0 })
        }

        play = () => {
		const { currentPlayer } = this.state
		this.players[currentPlayer].playing() ? this.players[currentPlayer].pause() : this.players[currentPlayer].play()
		
		this.setState({
			playing: this.players[currentPlayer].playing()
		})
	}

	nextAyah = () => {
		const { currentPlayer } = this.state
		let nextPlayer = (currentPlayer + 1) % this.players.length
		
		this.setState({ currentPlayer: nextPlayer })
		this.players[nextPlayer].play()
	}

	onChangeSurah = (e) => {
		let value = JSON.parse(e.target.value)

		let surah = value.index
		let ayahFrom = 1
		let ayahTo = 1
		let ayahCount = parseInt(value.count)

		this.setState({ 
			surah,
			ayahFrom,
			ayahTo,
			ayahCount
		})

		localStorage.setItem(KEY_SURAH, e.target.value)
		localStorage.setItem(KEY_SURAH, surah)
		localStorage.setItem(KEY_AYAH_FROM, ayahFrom)
		localStorage.setItem(KEY_AYAH_TO, ayahTo)
		localStorage.setItem(KEY_AYAH_COUNT, ayahCount)

		this.startFetch()

	}

        onChangeAyahFrom = (e) => {
		let ayahFrom = parseInt(e.target.value)
		let ayahTo = Math.max(ayahFrom, parseInt(this.state.ayahTo))

		this.setState({ ayahFrom, ayahTo })

		localStorage.setItem(KEY_AYAH_FROM, ayahFrom)
		localStorage.setItem(KEY_AYAH_TO, ayahTo)
		
		this.startFetch()
	}

	onChangeAyahTo = (e) => {
		let ayahTo = parseInt(e.target.value)

		this.setState({ ayahTo })
		
		localStorage.setItem(KEY_AYAH_TO, ayahTo)

		this.startFetch()
	}

        render({}, { surah, ayahFrom, ayahTo, ayahCount, ready, playing }) {
		let buttonDisabled = !(this.players && this.players.length !== 0 && this.players.length === ready)
		let surahValue = JSON.stringify({ index: surah, count: ayahCount })

                return (
                        <div id="app">
				<div class="nice">
					<h1>Ayah Player</h1>
				</div>

				<select class="nice" onChange={this.onChangeSurah} value={surahValue}>
					{ renderSurahOption() }
				</select>

				<select class="nice" onChange={this.onChangeAyahFrom} value={ayahFrom}>
					{ renderAyahOption(ayahCount) }
				</select>

				<select class="nice" onChange={this.onChangeAyahTo} value={ayahTo}>
					{ renderAyahOptionWithRange(ayahFrom, ayahCount) }
				</select>

				<button class="nice" disabled={buttonDisabled} onClick={this.play} >
					{ !buttonDisabled ? (playing ? 'pause' : 'play') : 'fetching' }
				</button>
                        </div>
                );
        }
}
