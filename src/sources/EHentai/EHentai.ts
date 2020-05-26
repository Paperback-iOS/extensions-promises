import { Source } from '../Source'
import { Manga, MangaStatus } from '../../models/Manga/Manga'
import { Chapter } from '../../models/Chapter/Chapter'
import { MangaTile } from '../../models/MangaTile/MangaTile'
import { SearchRequest } from '../../models/SearchRequest/SearchRequest'
import { Request } from '../../models/RequestObject/RequestObject'
import { ChapterDetails } from '../../models/ChapterDetails/ChapterDetails'
import { Tag, TagSection } from '../../models/TagSection/TagSection'
import { HomeSection, HomeSectionRequest } from '../../models/HomeSection/HomeSection'
import { LanguageCode } from '../../models/Languages/Languages'
import { APIWrapper } from '../../API'

const E_API = 'https://api.e-hentai.org/api.php'
const E_DOMAIN = 'https://e-hentai.org'
const E_HEROKU = 'http://paperback-redirector.herokuapp.com/eh'

export class EHentai extends Source {
  constructor(cheerio: CheerioAPI) {
    super(cheerio)
  }

  get version(): string { return '0.1.0' }
  get name(): string { return '(BETA) E-Hentai' }
  get icon(): string { return 'logo.png' }
  get author(): string { return 'Conrad Weiser' }
  get authorWebsite(): string { return 'https://github.com/ConradWeiser' }
  get description(): string { return 'Beta extension that pulls manga from E-Hentai. Some functionality may be missing still.' }
  get hentaiSource(): boolean { return true }
  getMangaShareUrl(mangaId: string): string | null { return `${E_DOMAIN}/g/${mangaId}`}

  getMangaDetailsRequest(ids: string[]): Request[] {
    let requests: Request[] = []
    for (let id of ids) {

      // Generate a proper json structure for this request
      let data = {
        method: "gdata",
        gidlist: [[Number(id.substr(0, id.indexOf("/"))), id.substr(id.indexOf("/") + 1, id.length)]],
        namespace: 1
      }

      let metadata = { 'id': id }
      requests.push(createRequestObject({
        url: `${E_API}`,
        metadata: metadata,
        method: 'POST',
        data: JSON.stringify(data)
      }))
    }
    return requests
  }

  getMangaDetails(data: any, metadata: any): Manga[] {
    let manga: Manga[] = []
    let res = data.gmetadata[0]

    let titles: string[] = [res.title]
    if(res.title_jpn) {
      titles.push(res.title_jpn)
    }

    let isHentai = !res.category.includes("Non-H")

    let tags: TagSection[] = [createTagSection({id: '0', label: 'tags', tags: []})]
    tags[0].tags = res.tags.map((elem: string) => createTag({id: elem, label: elem}))


    manga.push(createManga({
      id: metadata.id,
      titles: titles,
      image: res.thumb,
      rating: res.rating,
      status: MangaStatus.COMPLETED,
      artist: res.uploader,
      hentai: isHentai,
      lastUpdate: res.posted,
      tags: tags
    }))
    return manga
  }

  //TODO: Can we remove this entirely? Or substitute it out to a empty method?
  getChaptersRequest(mangaId: string): Request {
      // Generate a proper json structure for this request
      let data = {
        method: "gdata",
        gidlist: [[Number(mangaId.substr(0, mangaId.indexOf("/"))), mangaId.substr(mangaId.indexOf("/") + 1, mangaId.length)]],
        namespace: 1
      }

      console.log(JSON.stringify(data))

      let metadata = { 'id': mangaId }
      return createRequestObject({
        url: `${E_API}`,
        metadata: metadata,
        method: 'POST',
        data: JSON.stringify(data)
      })
  }

  getChapters(data: any, metadata: any): Chapter[] {

    return [createChapter({
      mangaId: metadata.id,
      id: "1",
      chapNum: 1,
      langCode: LanguageCode.UNKNOWN,
      time: new Date(data.gmetadata[0].posted)
    })]

  }

  getChapterDetailsRequest(mangaId: string, chapId: string): Request {
    let metadata = { 'mangaId': mangaId}
    return createRequestObject({
      url: `${E_HEROKU}/chapteroverview/${mangaId}`,
      metadata: metadata,
      method: 'GET',
    })
  }

  getChapterDetails(data: any, metadata: any): ChapterDetails {

    let pages: any[] = []
    for(let obj of data) {
      pages = pages.concat(obj)
    }

    return createChapterDetails({
      id: "1",
      mangaId: "1",
      pages: pages,
      longStrip: false
    })
  }



  searchRequest(query: SearchRequest, page: number): Request | null {
      return createRequestObject({
      //https://e-hentai.org/?f_search=female
      url: `${E_DOMAIN}?f_search=${query.title}`,
      method: "GET"
    })
  }

  search(data: any, metadata: any): MangaTile[] | null {
    let $ = this.cheerio.load(data)
    let mangaTiles: MangaTile[] = []

    let table = $('.itg')
    for(let item of $('tr', table).toArray()) {
      // Is this a valid response? 
      if($(item).text().includes("Title")) {
        continue
      }

      if(!$('.glink', $(item)).text()) {
        continue
      }

      let title = $('.glink', $(item)).text()
      let image = $('img', $('.glthumb', $(item))).attr('src')
      if(image?.includes("base64")) {
        image = $('img', $('.glthumb', $(item))).attr('data-src')
      }

      mangaTiles.push(createMangaTile({
        title: createIconText({text: title}),
        image: image!,
        id: '1'
      }))
    }
    
    return mangaTiles
  }
}